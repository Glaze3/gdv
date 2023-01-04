var Colors = [
    {name: 'red',    color: 'rgb(255, 99, 132)',  count: 0},
    {name: 'blue',   color: 'rgb(54, 162, 235)',  count: 0},
    {name: 'orange', color: 'rgb(255, 159, 64)',  count: 0},
    {name: 'purple', color: 'rgb(153, 102, 255)', count: 0},
    {name: 'green',  color: 'rgb(75, 192, 192)',  count: 0},
    {name: 'yellow', color: 'rgb(255, 205, 86)',  count: 0},
    {name: 'grey',   color: 'rgb(150, 150, 150)', count: 0},
];

var InitData = function(data, xName, yNames, cStart, cEnd){
    InitColors();
    data.sum.labels = [];
    data.sum.datasets = [];
    data.sum.maxValue = 0;
    data.cur.labels = [];
    data.cur.datasets = [];
    data.cur.labelRawIdx = 0;
    console.log('init data: '+ xName+', '+yNames+', '+cStart+', '+cEnd);
    //remove extra y axises from previous data
    var defaultAxises = ['x'];
    RemovePropertyExceptListed(data.sum.chartOption.scales, defaultAxises);
    RemovePropertyExceptListed(data.cur.chartOption.scales, defaultAxises);
    //for x axis
    var xSet = false;
    for(var i=0; i<data.raw.length; i++){
        var ds = data.raw[i];
        if(xName.indexOf(ds.label)>=0){
            //show count numbers at summary chart, calculate combine rate here
            SetX(data, ds, i);
            xSet = true;
            //cur data will be calculated at SetCurrentTo function
            break;
        }
    }
    if(!xSet && data.raw.length>0){
        var i = 0;
        var ds = data.raw[i];
        SetX(data, ds, i);
        xName = ds.label;
    }
    //for y axis
    var ySet = false;
    for(var i=0; i<data.raw.length; i++){
        var ds = data.raw[i];
        if(yNames.indexOf(ds.label)>=0){
            var color = GetColor();
            var minVal = AddY(data.sum, ds, i, color);
            AddY(data.cur, ds, i, color, true, minVal);
            ySet = true;
        }
    }
    if(!ySet && data.raw.length>1){
        var color = GetColor();
        var i = 1;
        var ds = data.raw[i];
        var minVal = AddY(data.sum, ds, i, color);
        AddY(data.cur, ds, i, color, true, minVal);
        yNames = ds.label;
    }
    //add selected dataset
    var sds = {label: 'Selected', fill: 'start', stepped: true, borderWidth: 0, pointRadius: 0, yAxisID: 'y', data: []};
    data.sum.datasets.push(sds);
    //display
    SetCurrentTo(data, cStart, cEnd);
    //xy selector
    BuildXYSelector(data, xName, yNames);
    //
    data.cur.chartOption.elements.point.pointRadius=0;
    data.sum.chartOption.scales.y.max = data.sum.maxValue;
    data.sum.chartOption.scales.y.min = data.sum.minValue;
};

var SetCurrentTo = function(data, start, end){
    var rawLen = data.raw[0].data.length;
    if(start==0 && end==0) end = parseInt(rawLen/10);
    if(start>=0 && start<end && end<rawLen){
        console.log('SetCurrentTo: '+ start+'~'+end);
        //make selection win data
        data.sum.winSize = end-start;
        data.sum.winStart = start;
        data.sum.winEnd = end;
        var selectData = [];
        console.log(data.sum.minValue+"..."+data.sum.maxValue)
        for(var i=0; i<start; i++) selectData.push(data.sum.minValue);
        for(var i=start; i<end; i++) selectData.push(data.sum.maxValue);
        for(var i=end; i<rawLen; i++) selectData.push(data.sum.minValue);
        var sds = FindDS(data.sum.datasets, 'Selected');
        var cdo = MakeCombinedData(data.sum, selectData, true);
        //console.log(cdo);
        sds.data = cdo.data;
        //make cur data
        var segData = GetSegment(data.raw[data.cur.labelRawIdx].data, start, end);
        var scdo = MakeCombinedData(data.cur, segData);
        data.cur.labels = scdo.data;
        for(var i=0; i<data.cur.datasets.length; i++){
            var ds = data.cur.datasets[i];
            var raw = data.raw[ds.rawDataIdx];
            var nsd = GetSegment(raw.data, start, end);
            scdo = MakeCombinedData(data.cur, nsd);
            ds.data = scdo.data;
        }
    }
};

var RefreshChart = function(){
    SumChart.options.scales.y.max = Data.sum.maxValue;
    SumChart.options.scales.y.min = Data.sum.minValue;
    var ts1 = Date.now();
    CurChart.update();
    var ts2 = Date.now();
    SumChart.update();
    var ts3 = Date.now();
    console.log('update CurChart used: '+(ts2-ts1));
    console.log('update SumChart used: '+(ts3-ts2));
  };

var JumpCurrentToCenter = function(data, center){
    var rawLen = data.raw[0].data.length;
    var winSize = data.sum.winSize;
    console.log('winSize: '+ winSize);
    if(center>0 && winSize>0){
      console.log('JumpCurrentToCenter: '+ center);
      var start = parseInt(center-winSize/2);
      var end = parseInt(center+winSize/2);
      if(start<0){
        var offset = -start;
        start += offset;
        end += offset;
      }else if(end>=rawLen){
        var offset = end-rawLen+1;
        start -= offset;
        end -= offset;
      }
      SetCurrentTo(data, start, end);
      RefreshChart();
    }
};

var ZoomCurrent = function(data, wheel, vx){
    console.log('ZoomCurrent: '+ wheel+', '+vx);
    var rawLen = data.raw[0].data.length;
    var winSize = data.sum.winSize;
    var scale = vx/winSize;
    console.log('ori winSize: '+ winSize + ', scale:'+scale);
    if(wheel>0){//zoom out
      winSize = parseInt(winSize*1.2);
    }else{//zoom in
      winSize = parseInt(winSize*0.8);;
    }
    if(winSize<10) winSize = 10;
    if(winSize>rawLen-1) winSize = rawLen-1;
    data.sum.winSize = winSize;
    var absVX = data.sum.winStart+vx;
    var newStart = parseInt(absVX-scale*winSize);
    console.log('winStart: '+ data.sum.winStart+', newStart:'+newStart);
    if(newStart<0) newStart = 0;
    var newEnd = newStart+winSize;
    if(newEnd>=rawLen-1){
      newEnd = rawLen-1;
      newStart = newEnd-winSize;
    }
    console.log('new winSize: '+ winSize+', ns:'+newStart+', ne:'+newEnd);
    SetCurrentTo(data, newStart, newEnd);
    //display point or not
    if(winSize<100){
      CurChart.options.elements.point.pointRadius=3;
      CurChart.options.elements.point.pointStyle='circle';
    }else{
      CurChart.options.elements.point.pointRadius=0;
    }
    //refresh
    RefreshChart();
};

var PanCurrent = function(data, dx){
    console.log('PanCurrent: '+ dx);
    var rawLen = data.raw[0].data.length;
    var newStart = data.sum.winStart+dx;
    var newEnd = data.sum.winEnd+dx;
    if(newStart<0){
      newEnd -= newStart;
      newStart = 0;
    }
    if(newEnd>rawLen-1){
      var d = newEnd - (rawLen-1);
      newEnd = rawLen-1;
      newStart -= d;
    }
    if(newStart>=0 && newEnd<rawLen-1){
      SetCurrentTo(data, newStart, newEnd);
      RefreshChart();
    }
};

var FindDS = function(datasets, name){
    var ds = null;
    for(var i=0; i<datasets.length; i++){
        if(datasets[i].label==name){
            ds = datasets[i];
            break;
        }
    }
    return ds;
};

var InsertY = function(data, name){
    var added = false;
    var color = null;
    for(var i=0; i<data.raw.length; i++){
        var ds = data.raw[i];
        if(name==ds.label){
            color = GetColor();
            var minVal = AddY(data.sum, ds, i, color);
            AddY(data.cur, ds, i, color, true, minVal);
            added = true;
            break;
        }
    }
    if(added){
        SetCurrentTo(data, data.sum.winStart, data.sum.winEnd);
    }
    return color;
};

var RemoveY = function(data, name){
    var dds = null;
    dds = DelY(data.sum, name);
    dds = DelY(data.cur, name);
    if(dds!=null){
        ReturnColor(dds.borderColor);
    }
    //console.log(Colors);
};

var DelY = function(chartDataObj, name){
    var dds = null;
    for(var i=0; i<chartDataObj.datasets.length; i++){
        var ds = chartDataObj.datasets[i];
        if(ds.label==name){
            dds = chartDataObj.datasets.splice(i, 1)[0];
            delete chartDataObj.chartOption.scales[dds.yAxisID];
            console.log('y removed: '+ name);
            break;
        }
    }
    return dds;
};

var RemovePropertyExceptListed = function(obj, exceptList){
    for (var key in obj) {
        var isExcept = false;
        for(var i=0; i<exceptList.length; i++){
            if(exceptList[i]==key){
                isExcept = true;
                break;
            }
        }
        if(!isExcept){
            delete obj[key];
            console.log('property '+key+' is removed');
        }
    }
};

var GetSegment= function(data, start, end){
    var segment = [];
    for(var i=start; i<=end; i++){
        segment.push(data[i]);
    }
    return segment
};

var GetYAxisId = function(chartDataObj){
    var dsLen = chartDataObj.datasets.length;
    var yid = 'y'+(dsLen>0?dsLen:'');
    return yid;
};

var GetScale = function(option, yAxisID){
    if(typeof option.scales[yAxisID]==='undefined'){
      option.scales[yAxisID] = {};
    }
    return option.scales[yAxisID];
};

var InitColors = function(){
    for(var i=0; i<Colors.length; i++){
        Colors[i].count = 0;
    }
};

var GetColor = function(){
    var c = Colors[0];
    for(var i=0; i<Colors.length; i++){
        var color = Colors[i];
        if(color.count<c.count){
            c = color;
        }
    }
    c.count++;
    //console.log(Colors);
    console.log(c.name+' assigned');
    return c;
};

var ReturnColor = function(color){
    for(var i=0; i<Colors.length; i++){
        var c = Colors[i];
        if(c.color==color){
            c.count--;
            console.log(c.name+' returned');
            break;
        }
    }
};

var AddY = function(chartDataObj, rawDataObj, rawDataIdx, color, infoOnly=false, minValue=0){
    var cdo = {
        data: [],
        min: minValue,
        max: 0,
    };
    if(!infoOnly) cdo = MakeCombinedData(chartDataObj, rawDataObj.data);
    var nds = {};
    nds.label = rawDataObj.label;
    nds.data = cdo.data;
    nds.yAxisID = GetYAxisId(chartDataObj);
    nds.rawDataIdx = rawDataIdx;
    nds.borderColor = color.color;
    nds.colorName = color.name;
    var scale = GetScale(chartDataObj.chartOption, nds.yAxisID);
    var scalePos = GetNextScalePosition(chartDataObj.chartOption.scales);
    scale.beginAtZero = cdo.min>=0;
    scale.display = true;
    scale.position = scalePos;
    if(nds.yAxisID=='y'){
        chartDataObj.maxValue = cdo.max==0?100:cdo.max;
        chartDataObj.minValue = cdo.min;
    }
    chartDataObj.datasets.push(nds);
    console.log('y('+nds.yAxisID+') added: '+ nds.label+', beginAtZero='+scale.beginAtZero+', min='+cdo.min);
    return cdo.min;
};

var GetNextScalePosition = function(scales){
    var lc = 0;
    var rc = 0;
    for(key in scales){
        if(scales[key].position=='right') rc++;
        else if(scales[key].position=='left')lc++;
    }
    var pos = lc>rc?'right':'left';
    console.log(lc+' vs '+rc+' = '+pos);
    return pos;
};

var SetX = function(data, rawDataObj, rawDataIdx){
    var cdo = MakeCombinedData(data.sum, rawDataObj.data);
    data.sum.labels = GenNumberSequence(cdo.length);
    data.sum.labelRawIdx = rawDataIdx;
    data.cur.labelRawIdx = rawDataIdx;
    console.log('x set to: '+ rawDataObj.label);
};

var GenNumberSequence = function(size){
    var a = [];
    for(var i=0; i<size; i++){
        a.push(i+1);
    }
    return a;
};

var GenStringSequence = function(size){
    var a = [];
    for(var i=0; i<size; i++){
        a.push('~'+(i+1));
    }
    return a;
};

var MakeCombinedData = function(chartDataObj, data, asText=false){
    var ct = chartDataObj.combineThreshold;
    var len = data.length;
    var combineEvery = 1;
    if(len>ct){
        combineEvery = parseInt(len/ct);
    }
    chartDataObj.combineEvery = combineEvery;

    var isAllNumber = true;
    var min = 0;
    var max = 0;
    for(var i=0; i<data.length; i++){
        var v = data[i];
        if(isNaN(v)){
            isAllNumber = false;
            break;
        }
        if(v<min) min = v;
        else if(v>max) max = v;
    }
    var nd = [];
    if(combineEvery>1){
      if(isAllNumber && !asText){
        var c = 0;
        var v = 0;
        for(var i=0; i<data.length; i++){
          v += parseInt(data[i]);
          c++;
          if(c==combineEvery){
            nd.push(parseInt(v/c));
            c = 0;
            v = 0;
          }
        }
        if(c>0){
          nd.push(parseInt(v/c));
        }
      }else{
        var c = 0;
        var v = '';
        for(var i=0; i<data.length; i++){
          if(v=='') v = data[i];
          c++;
          if(c==combineEvery){
            nd.push(v);
            c = 0;
            v = '';
          }
        }
        if(c>0){
          nd.push(v);
        }
      }
    }else{
      nd = data;
    }
    var output = {
        data: nd,
        length: nd.length,
        combineEvery: combineEvery,
        isAllNumber: isAllNumber,
        min: min,
        max: max,
    };
    //console.log(output);
    return output;
};

var GenSinData = function(size, step, offset, strength, yoffset){
    var data = [];
    var x = offset;
    for(var i=0; i<size; i++){
        var y = Math.sin(x)*strength+yoffset;
        data.push(y);
        x+=step;
    }
    return data;
};

var isAllPrintableChar = function(str){
    var apc = true;
    str = str.replaceAll('\t', ' ');
    //console.log(str);
    for(var i=0; i<str.length; i++){
        var cc = str.charCodeAt(i);
        //console.log(str[i]+"="+cc);
        if(cc<32 || cc==127){
            apc = false;
            break;
        }
    }
    return apc;
};

var ParseFileData = function(fileData){
    console.log('ParseFileData start...');
    console.log('fileData.length='+fileData.length);
    var list = [];
    var li = fileData.indexOf('\r\n');
    var ti = fileData.indexOf('\t');
    var ci = fileData.indexOf(',');
    console.log('li='+li+', ti='+ti+', ci='+ci);
    if(li>0){
        var apc = isAllPrintableChar(fileData.substring(0, li));
        if(apc && ti>0 && ti<li){
            list = ParseTab(fileData);
        }else if(apc && ci>0 && ci<li){
            list = ParseCSV(fileData);
        }else{
            console.log('unsupported file');
        }
    }
    var data = [];
    if(list.length>0){
        var head = list[0];
        for(var i=0; i<head.length; i++){
            var obj = {};
            obj.label = head[i];
            obj.data = [];
            var isTs = obj.label=='Timestamp';
            var NaNCt = 0;
            var NumCt = 0;
            var EmpCt = 0;
            for(var j=1; j<list.length; j++){
            if(isTs){
                obj.data.push(list[j][i].replace('T', ' '));
                NaNCt++;
            }else{
                var v = list[j][i];
                var nb = Number(v);
                if(window.isNaN(nb)){
                    obj.data.push(v);
                    NaNCt++;
                }else{
                    obj.data.push(nb);
                    if(v!='') NumCt++;
                    else EmpCt++;
                } 
            }
            }
            obj.isAllNaN = NaNCt>0 && NumCt==0;
            obj.hasEmpty = EmpCt>0;
            console.log(obj.label+', NaNCt='+NaNCt+', NumCt='+NumCt+', isAllNaN='+obj.isAllNaN+', hasEmpty='+obj.hasEmpty);
            data.push(obj);
            //console.log(obj);
        }
    }
    console.log('ParseFileData end.');
    return data;
};

var ParseTab = function(fileData){
    console.log('ParseTab start...');
    var lines = fileData.split('\r\n');
    var list = [];
    for(var i=0; i<lines.length; i++){
      if(lines[i].length>0)
        list.push(lines[i].split('\t'));
    }
    console.log('list:'+list.length);
    console.log('ParseTab end.');
    return list;
};

var ParseCSV = function(fileData){
    console.log('ParseCSV start...');
    var lines = fileData.split('\r\n');
    var list = [];
    for(var i=0; i<lines.length; i++){
        var line = lines[i];
        if(line.length>0){
            if(line.indexOf('"')==0){
                list.push(line.split(','));
            }else{
                var values = [];
                line = line.replaceAll('""', '{QUOTE}');
                var isInQuote = false;
                var value = "";
                for(var j=0; j<line.length; j++){
                    var c = line[j];
                    if(c=='"'){
                        if(isInQuote){
                            isInQuote = false;
                        }else{
                            isInQuote = true;
                        }
                    }else if(c==','){
                        if(isInQuote){
                            value += c;
                        }else{
                            values.push(value.replaceAll('{QUOTE}', '"'));
                            value = "";
                        }
                    }else{
                        value += c;
                    }
                }
                if(value.length>0) values.push(value.replaceAll('{QUOTE}', '"'));
                list.push(values);
            }
        }
    }
    console.log('list:'+list.length);
    console.log('ParseCSV end.');
    return list;
};

var GetCurrentContent = function(data, visiableColsOnly=false){
    var content = '';
    var idxs = [];
    idxs.push(data.cur.labelRawIdx);
    for(var i=0; i<data.cur.datasets.length; i++){
        idxs.push(data.cur.datasets[i].rawDataIdx);
    }
    for(var i=0; i<data.raw.length; i++){
        if(!visiableColsOnly || idxs.indexOf(i)!=-1){
            content += data.raw[i].label+'\t';
        }
    }
    content+='\r\n';
    for(var j=data.sum.winStart; j<=data.sum.winEnd; j++){
        for(var i=0; i<data.raw.length; i++){
            if(!visiableColsOnly || idxs.indexOf(i)!=-1){
                var dt = data.raw[i];
                content += dt.data[j]+'\t';
            }
        }
        content+='\r\n';
    }
    return content;
};