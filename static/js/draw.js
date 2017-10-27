var map = L.map('map', {"center":[39.92237576385941,116.43753967285156],"zoom":11});

map.createPane('mask');
map.createPane('district');
map.createPane('subway');
map.createPane('houses');

map.getPane('mask').style.zIndex = 250;
map.getPane('district').style.zIndex = 300;
map.getPane('subway').style.zIndex = 350;
map.getPane('houses').style.zIndex = 399;

// 蒙板遮罩
var bounds = [[-90, -360], [90, 360]];
var mask = L.rectangle(bounds, {fillColor: "#00050A", fillOpacity: 0.8, pane: 'mask'}).addTo(map);

var baseLayers = {
    "电子地图": L.tileLayer.chinaProvider('GaoDe.Normal.Map', {
        maxZoom: 18,
        attribution: '高德'
    }),
    '暗色底图': L.tileLayer.chinaProvider('Geoq.Normal.PurplishBlue', {
        maxZoom: 18,
        attribution: 'geoq'
    }).addTo(map)
};

var layerControl = L.control.layers(baseLayers, {}, {
    position: 'topleft',
    collapsed: true,
    // autoZIndex: true
}).addTo(map);

var tooltip_style = {'className': 'tooltip'};

var unitRange = [50, 200];
var areaRange = [10, 150];
var circles = [];
var heatPoints = [];
var names = [];

// geojson
var districtLayer;
var subwayLayer;

var geo_style = {
  color: "#cb181d",
  weight: 2,
  opacity: 0.4,
  fillOpacity: 0
};

var subway_style = {
  color: "#cc4c02",
  weight: 2,
  opacity: 0.8
};

subwayLayer = L.geoJson(subway, {
  style: subway_style,
  pane: 'subway',
  onEachFeature: onEachFeature
}).addTo(map);

subwayLayer.eachLayer(function (layer) {
  layer.bindPopup(layer.feature.properties.name, tooltip_style);
});

districtLayer = L.geoJson(bj, {
  style: geo_style,
  pane: 'district'
  // onEachFeature: onEachFeature
}).addTo(map);

function highlightFeature(e) {
  var layer = e.target;

  layer.setStyle({
    weight: 6,
  });

  if (!L.Browser.ie && !L.Browser.opera && !L.Browser.edge) {
    layer.bringToFront();
  }
}

function resetHighlight(e) {
  subwayLayer.resetStyle(e.target);
}

function zoomToFeature(e) {
  map.fitBounds(e.target.getBounds());
}

function onEachFeature(feature, layer) {
  layer.on({
    mouseover: highlightFeature,
    mouseout: resetHighlight,
    click: zoomToFeature
  });
}

//获取数据
fetch('/js/bj_rent.json')
.then(function(response) {
  return response.json();
})
.then(function(ds){
  ds
  .forEach(function(d){
    var unit = d.unit;
    var area = d.area;
    var unitMin = unitRange[0], unitMax = unitRange[1];
    var areaMin = areaRange[0], areaMax = areaRange[1];
    var unit01 = getK(unit, unitMin, unitMax);
    var area01 = getK(area, areaMin, areaMax);
    var size = getSize(area01);
    var color = getColor(unit01);
    var subway;
    if (d.subway) {
      subway = d.subway;
    } else {
      subway ='';
    }

    var circle = L.circleMarker({
      lat: d.lat,
      lng: d.lng
    }, {
      stroke: false,
      fillColor: color,
      pane: 'houses'
    })
    .addTo(map);
    circle.setRadius(size);
    circle.__data = d;
    circle.bindPopup(
                '小区名:' + d.region +
                '<br> 价格（元/月/平方）： ' + d.unit +
                '<br> 面积： ' + d.area + '平米' +
                '<br> 装修： ' + d.decoration +
                '<br> 供暖： ' + d.heating +
                '<br> 地铁： ' + subway,
                tooltip_style);
    circles.push(circle);
    heatPoints.push([d.lat, d.lng]);
    names.push(d.region);
    // circle.bringToFront();
  });
  initQuery();
});

var heat = L.heatLayer(heatPoints, {
    radius: 12,
    blur: 12,
    minOpacity: 0.5
}).addTo(map);

layerControl.addOverlay(districtLayer, '行政区');
layerControl.addOverlay(subwayLayer, '地铁');
layerControl.addOverlay(heat, '热力图');

//归一化
function getK(v, min, max){
  v = Math.max(Math.min(v, max), min);
  return (v - min) / (max - min);
}

//颜色字符串 -> 数组
function str2array(c){
  return c
  .replace('rgba(', '')
  .replace(')', '')
  .split(',')
  .map(function(v){
    return parseFloat(v, 10);
  });
}

//颜色映射函数
var crange = ['rgba(250,159,181,0.4)', 'rgba(174,1,126,0.8)'];
function getColor(ki){
  var cminArray = str2array(crange[0]);
  var cmaxArray = str2array(crange[1]);
  //
  var r = Math.floor(cminArray[0] + (cmaxArray[0] - cminArray[0]) * ki);
  var g = Math.floor(cminArray[1] + (cmaxArray[1] - cminArray[1]) * ki);
  var b = Math.floor(cminArray[2] + (cmaxArray[2] - cminArray[2]) * ki);
  var a = cminArray[3] + (cmaxArray[3] - cminArray[3]) * ki;
  //
  return 'rgba(' + [r,g,b,a].join(',') + ')';
}

// 大小映射函数
var rrange = [2, 8]
function getSize(ki){
  var rmin = rrange[0], rmax = rrange[1];
  return rmin + (rmax - rmin) * ki;
}

//
function updateScatter(){
  circles.forEach(function(circle){
    var d = circle.__data;
    var unit = d.unit;
    var area = d.area;
    var unitMin = unitRange[0], unitMax = unitRange[1];
    var areaMin = areaRange[0], areaMax = areaRange[1];
    var unit01 = getK(unit, unitMin, unitMax);
    var area01 = getK(area, areaMin, areaMax);
    var size = getSize(area01);
    var color = getColor(unit01);

    // if(!rangeFilter(d))
    //   color = 'rgba(0,0,0,0)';
      circle.setRadius(size);
      circle.setStyle({
        stroke: false,
        fillColor: color
    });
  });
}
//点大小、颜色控制面板
var gui = new dat.gui.GUI();
// gui.domElement.id = 'gui';
var p1 = gui.addFolder('控制面板');
p1.addColor(crange, '0').name('最小值颜色').onChange(updateScatter);
p1.addColor(crange, '1').name('最大值颜色').onChange(updateScatter);
p1.add(rrange, '0', 0, 5).name('最小值大小').onChange(updateScatter);
p1.add(rrange, '1', 0, 10).name('最大值大小').onChange(updateScatter);
p1.open();

//搜索模块
function initQuery() {
    var engine = new Bloodhound({
        datumTokenizer: Bloodhound.tokenizers.whitespace,
        queryTokenizer: Bloodhound.tokenizers.whitespace,
        local: names,
    });
    engine.initialize();
    $('.typeahead').typeahead({
        highlight: true
    }, {
        source: engine,
        templates: {
          suggestion: function(data) {
              return '<p class="custom-templates"><strong>' + data + '</strong></p>';
          }
        }
    });
    $('.typeahead').click(function(){
        $(this).val('');
    });
    $('.typeahead').bind('typeahead:select', function(event, suggestion) {
        circles.forEach(function(circle){
            var d = circle.__data;
            if (d.region === suggestion) {
                map.fitBounds([[d.lat, d.lng]], {
                    maxZoom: 16
                });
            }
        });
    });
}
