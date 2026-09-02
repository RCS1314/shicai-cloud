/* ============ 食材流体云 app.js ============ */
(function(){
'use strict';

var $ = function(id){ return document.getElementById(id); };
var canvas = $('cloud'), ctx = canvas.getContext('2d');
var statusEl = $('status'), tagsEl = $('tags'), emptyHint = $('emptyHint');
var metaEl = $('meta'), histEl = $('history');
var ingredientsTa = $('ingredients');
var paused = false;

/* ---------- 通用食材词典（用于 OCR 后自动提取） ---------- */
var DICT = [
  // 主食
  '米饭','大米','小米','面条','面粉','馒头','饺子','馄饨','汤圆','面包','燕麦','玉米','红薯','土豆粉','粉丝','米粉','糯米','薏米','粥',
  // 肉类
  '猪肉','五花肉','里脊','排骨','牛肉','羊肉','鸡肉','鸭肉','鸡翅','鸡腿','鸡胸','鸡爪','鸭掌','腊肉','香肠','火腿','培根','午餐肉','肉末','肉丝','肉片','猪蹄','猪肝','猪肚','牛腩','牛腱','牛肚','肥牛','肥羊','鸡胗','内脏','鱼','鱼头','鱼片','鱼块','虾','虾仁','蟹','蟹肉棒','鱿鱼','贝','蛤蜊','花甲','扇贝','生蚝','带鱼','草鱼','鲈鱼','鲫鱼','龙利鱼','黄鱼','三文鱼',
  // 蔬菜
  '青菜','小白菜','大白菜','娃娃菜','菠菜','生菜','油麦菜','空心菜','上海青','芹菜','韭菜','香菜','葱','大葱','小葱','洋葱','蒜','大蒜','蒜薹','蒜苗','姜','生姜','辣椒','青椒','红椒','小米椒','尖椒','干辣椒','彩椒','番茄','西红柿','黄瓜','冬瓜','南瓜','苦瓜','丝瓜','西葫芦','茄子','胡萝卜','白萝卜','青萝卜','土豆','山药','芋头','莲藕','豆角','四季豆','扁豆','荷兰豆','豇豆','豌豆','毛豆','蚕豆','玉米','西兰花','花菜','菜花','卷心菜','包菜','紫甘蓝','芦笋','竹笋','冬笋','春笋','金针菇','香菇','蘑菇','杏鲍菇','平菇','木耳','银耳','海带','紫菜','豆芽','黄豆芽','绿豆芽','秋葵','芥蓝','苋菜','茭白','蕨菜','苦菜','马齿苋',
  // 豆制品/蛋
  '豆腐','豆腐干','豆腐皮','豆干','腐竹','豆皮','千张','鸡蛋','鸭蛋','鹌鹑蛋','皮蛋','咸蛋','松花蛋','蛋白','蛋黄',
  // 调料
  '盐','糖','白糖','红糖','冰糖','酱油','生抽','老抽','蚝油','醋','陈醋','香醋','料酒','黄酒','白酒','十三香','五香粉','胡椒粉','花椒','八角','桂皮','香叶','孜然','辣椒面','豆瓣酱','甜面酱','番茄酱','沙拉酱','芝麻酱','花生酱','芥末','味精','鸡精','淀粉','生粉','芝麻油','香油','橄榄油','食用油','菜籽油','猪油','蜂蜜','柠檬','泡椒','腐乳','豆豉','咖喱','奶酪','芝士','黄油','奶油','椰浆','炼乳',
  // 水果
  '苹果','香蕉','橙子','橘子','柚子','梨','桃','葡萄','提子','西瓜','哈密瓜','草莓','蓝莓','猕猴桃','火龙果','芒果','菠萝','榴莲','椰子','樱桃','杨梅','荔枝','龙眼','柠檬','柿子','石榴','枣','红枣','枸杞','桂圆','山楂','无花果',
  // 干货
  '花生','核桃','杏仁','腰果','瓜子','芝麻','松子','板栗','红枣','香菇','干贝','虾米','瑶柱','枸杞',
  // 其他
  '牛奶','酸奶','奶粉','豆浆','豆腐脑','奶茶','可乐','啤酒','凉皮','油条','煎饼','包子','花卷','烧饼','年糕','粽','蛋糕','饼干','薯条','炸鸡',
  '冰粉','凉粉','果冻','布丁','冰沙','冰淇淋'
];

/* ---------- 解析输入为 [{name, qty, weight}] ---------- */
function parseIngredients(text){
  var items = [];
  var lines = String(text||'').split(/[\n,，、;；]+/);
  lines.forEach(function(line){
    line = line.trim();
    if(!line) return;
    // 匹配 名称 + 数量/重量，如 "鸡蛋 3 个" "五花肉 300g" "两个番茄"
    var m = line.match(/^(.+?)\s*([0-9一二三四五六七八九十两半]+)\s*(个|枚|颗|根|条|只|斤|克|g|G|kg|KG|块|包|袋|勺|碗|片|瓣|头|束|把|毫升|升)?$/);
    if(m){
      var name = m[1].trim(), qty = m[2], unit = (m[3]||'').toLowerCase();
      var weight = 0;
      if(unit==='克'||unit==='g'){ weight = chineseNumToInt(qty); }
      else if(unit==='斤'){ weight = chineseNumToInt(qty)*500; }
      else if(unit==='公斤'||unit==='kg'){ weight = chineseNumToInt(qty)*1000; }
      items.push({name:name, qty:qty+unit, weight:weight});
    } else {
      items.push({name:line, qty:'', weight:0});
    }
  });
  return dedup(items);
}
function chineseNumToInt(s){
  var map = {'一':1,'二':2,'两':2,'三':3,'四':4,'五':5,'六':6,'七':7,'八':8,'九':9,'十':10,'半':0.5};
  var n = 0;
  for(var i=0;i<String(s).length;i++){ n = n*10 + (map[s[i]]||0); }
  return n;
}
function dedup(arr){
  var seen = {}, out = [];
  arr.forEach(function(it){
    var k = it.name.trim();
    if(!k || seen[k]) return;
    seen[k]=1; out.push(it);
  });
  return out;
}

/* ---------- OCR 提取食材 ---------- */
var worker = null;
async function ocrImage(img){
  if(!window.Tesseract){
    throw new Error('OCR 引擎未加载，请检查网络后重试');
  }
  statusEl.textContent = '正在加载离线中文识别引擎…';
  if(!worker){
    worker = await Tesseract.createWorker('chi_sim', 1, {
      langPath: './lib/lang',   // 本地语言包，离线可用
      logger: function(m){
        if(m.status==='recognizing text'){
          statusEl.textContent = '正在识别文字：' + Math.round(m.progress*100) + '%';
        }
      }
    });
  }
  statusEl.textContent = '正在识别文字…';
  var res = await worker.recognize(img);
  return res.data.text;
}

/* 从 OCR 文本中提取食材（词典匹配 + 提取 数量词） */
function extractFromText(text){
  var found = [];
  DICT.forEach(function(food){
    if(text.indexOf(food) > -1){
      found.push({name: food, qty:'', weight:0});
    }
  });
  return dedup(found);
}

/* ---------- 画布：流体云动画 ---------- */
var particles = [], animId = null;
var COLORS = ['#5ec8ff','#7dffd4','#ffd27d','#ff9ad5','#b08cff','#8effd0','#ffc1a1'];
function weightOf(it){
  // 权重：有克重按克重；有数量按数量*50；都没有权重1
  if(it.weight>0) return it.weight;
  var n = chineseNumToInt(it.qty.replace(/[^一二三四五六七八九十两半0-9]/g,''));
  if(n>0) return n*50;
  return 1;
}

function layout(){
  var dpr = window.devicePixelRatio||1;
  var w = canvas.clientWidth || 360;
  var h = Math.max(300, Math.min(520, w*1.1));
  canvas.width = w*dpr; canvas.height = h*dpr;
  ctx.setTransform(dpr,0,0,dpr,0,0);
  canvas.style.height = h+'px';
  return {w:w, h:h};
}

function buildCloud(items){
  particles = [];
  var total = 0;
  items.forEach(function(it){ total += weightOf(it); });
  var area = {w:0,h:0};
  var layer = layout(); area.w = layer.w; area.h = layer.h;
  emptyHint.style.display = items.length ? 'none' : 'flex';
  metaEl.textContent = '共 '+items.length+' 种食材';
  renderTags(items);

  var cx = area.w/2, cy = area.h/2, placed = [];
  items.forEach(function(it){
    var w = weightOf(it)/total;
    var size = Math.round(20 + w*46); // 18~66px
    var x = cx + (Math.random()-0.5)*area.w*0.6;
    var y = cy + (Math.random()-0.5)*area.h*0.6;
    var attempt = 0, rad = size*0.55;
    // 简单防碰撞
    while(attempt < 300){
      var ok = placed.every(function(p){
        var dx = p.x-x, dy=p.y-y;
        return (dx*dx + dy*dy) > (p.r+rad)*(p.r+rad);
      });
      if(ok) break;
      x = cx + (Math.random()-0.5)*area.w*0.85;
      y = cy + (Math.random()-0.5)*area.h*0.85;
      attempt++;
    }
    placed.push({x:x,y:y,r:rad});
    particles.push({
      name: it.name, qty: it.qty, size: size,
      x:x, y:y, vx:(Math.random()-0.5)*0.8, vy:(Math.random()-0.5)*0.8,
      phase: Math.random()*Math.PI*2,
      color: COLORS[Math.floor(Math.random()*COLORS.length)],
      weight: w
    });
  });
  stopAnim(); startAnim();
}

var t0 = null;
function startAnim(){
  t0 = performance.now();
  animId = requestAnimationFrame(draw);
}
function stopAnim(){
  if(animId){ cancelAnimationFrame(animId); animId=null; }
}

function draw(now){
  var dpr = window.devicePixelRatio||1;
  var w = canvas.width/dpr, h = canvas.height/dpr;
  ctx.clearRect(0,0,w,h);
  // 背景流体光斑
  var t = (now-t0)/1000;
  var g = ctx.createRadialGradient(w*0.3+Math.sin(t*0.3)*30, h*0.25+Math.cos(t*0.25)*20, 10, w*0.3+Math.sin(t*0.3)*30, h*0.25, w*0.6);
  g.addColorStop(0,'rgba(94,200,255,0.10)');
  g.addColorStop(1,'rgba(125,255,212,0)');
  ctx.fillStyle=g; ctx.fillRect(0,0,w,h);

  particles.forEach(function(p){
    // 流体漂移（正弦扰动）
    p.x += p.vx*0.6 + Math.sin(t*0.8 + p.phase)*0.5;
    p.y += p.vy*0.6 + Math.cos(t*0.6 + p.phase*1.3)*0.5;
    if(p.x<-p.size){p.x=w+p.size;} if(p.x>w+p.size){p.x=-p.size;}
    if(p.y<-p.size){p.y=h+p.size;} if(p.y>h+p.size){p.y=-p.size;}

    // 呼吸脉动
    var breath = 1 + Math.sin(t*1.6 + p.phase)*0.04;
    var fs = Math.round(p.size*breath);

    ctx.save();
    ctx.shadowColor = p.color; ctx.shadowBlur = 14;
    ctx.font = '700 '+fs+'px "PingFang SC","Microsoft YaHei",sans-serif';
    ctx.textAlign='center'; ctx.textBaseline='middle';
    ctx.fillStyle = p.color;
    ctx.fillText(p.name, p.x, p.y);
    ctx.shadowBlur=0;

    // 数量小标
    if(p.qty){
      ctx.font = '500 '+(Math.max(11, fs*0.32))+'px "PingFang SC",sans-serif';
      ctx.fillStyle='rgba(234,242,255,.75)';
      ctx.fillText(p.qty, p.x, p.y + fs*0.66);
    }
    ctx.restore();
  });
  if(!paused) animId = requestAnimationFrame(draw);
}

/* ---------- tags 展示 ---------- */
function renderTags(items){
  tagsEl.innerHTML = '';
  items.forEach(function(it, i){
    var s = document.createElement('span');
    s.className='tag';
    s.textContent = it.name + (it.qty?(' '+it.qty):'');
    var rm = document.createElement('button');
    rm.textContent = '×';
    rm.onclick = function(){
      items.splice(i,1);
      refreshTextFromItems(items);
    };
    s.appendChild(rm);
    tagsEl.appendChild(s);
  });
}
function refreshTextFromItems(items){
  ingredientsTa.value = items.map(function(it){return it.name+(it.qty?' '+it.qty:'');}).join('、');
  renderTags(items);
  buildCloud(items);
}

/* ---------- 图片选择与 OCR ---------- */
function handleImage(file){
  if(!file) return;
  if(!/^image/.test(file.type)){ statusEl.textContent='请选择图片文件'; return; }
  var url = URL.createObjectURL(file);
  var img = new Image();
  img.onload = async function(){
    var pre = $('preview');
    pre.style.display='block'; pre.innerHTML='';
    pre.appendChild(img);
    statusEl.className='status';
    statusEl.textContent='开始识别图片…';
    try{
      var text = await ocrImage(file);
      statusEl.textContent='识别完成，正在提取食材…';
      statusEl.className='status done';
      var found = extractFromText(text);
      if(!found.length){
        statusEl.textContent='未识别到食材词，请在下方手动填入或检查图片清晰度。';
        statusEl.className='status err';
        return;
      }
      // 合并：识别结果追加到当前清单
      var current = parseIngredients(ingredientsTa.value);
      var map = {};
      current.concat(found).forEach(function(it){
        if(!map[it.name]){ map[it.name]=it; }
      });
      var merged = Object.keys(map).map(function(k){ return map[k]; });
      ingredientsTa.value = merged.map(function(it){return it.name+(it.qty?' '+it.qty:'');}).join('、');
      renderTags(merged);
      buildCloud(merged);
      saveHistory(merged);
    }catch(e){
      statusEl.textContent='识别失败：'+e.message;
      statusEl.className='status err';
    }
  };
  img.src = url;
}

/* ---------- 历史记录 ---------- */
var HIST_KEY='foodcloud_history';
function saveHistory(items){
  var arr = JSON.parse(localStorage.getItem(HIST_KEY)||'[]');
  arr.unshift({time:new Date().toLocaleString('zh-CN'), names:items.map(function(i){return i.name;})});
  arr = arr.slice(0,8);
  localStorage.setItem(HIST_KEY, JSON.stringify(arr));
  renderHistory();
}
function renderHistory(){
  var arr = JSON.parse(localStorage.getItem(HIST_KEY)||'[]');
  if(!arr.length){ histEl.innerHTML='<p class="hint">暂无历史记录</p>'; return; }
  histEl.innerHTML='';
  arr.forEach(function(h, idx){
    var d = document.createElement('div');
    d.style.cssText='padding:8px 0;border-bottom:1px solid var(--line);font-size:13px;';
    var t = document.createElement('div'); t.style.color='var(--sub)'; t.style.fontSize='11px';
    t.textContent = h.time + ' · '+h.names.length+' 种';
    h.names.forEach(function(n){
      var c = document.createElement('span'); c.className='chip'; c.textContent=n;
      d.appendChild(c);
    });
    d.appendChild(t);
    histEl.appendChild(d);
  });
}

/* ---------- 事件绑定 ---------- */
$('camera-input').addEventListener('change', function(e){ handleImage(e.target.files[0]); e.target.value=''; });
$('gallery-input').addEventListener('change', function(e){ handleImage(e.target.files[0]); e.target.value=''; });

$('generate').addEventListener('click', function(){
  var items = parseIngredients(ingredientsTa.value);
  if(!items.length){ statusEl.textContent='请先输入或识别食材'; statusEl.className='status err'; return; }
  buildCloud(items);
  saveHistory(items);
  statusEl.textContent='已生成流体云';
  statusEl.className='status done';
});
$('clearAll').addEventListener('click', function(){
  ingredientsTa.value=''; tagsEl.innerHTML='';
  particles=[]; stopAnim();
  var l=layout(); ctx.clearRect(0,0,l.w,l.h);
  emptyHint.style.display='flex';
  metaEl.textContent='共 0 种食材';
});
$('download').addEventListener('click', function(){
  var a=document.createElement('a');
  a.download='食材准备清单.png';
  a.href = canvas.toDataURL('image/png');
  a.click();
});
// 长按暂停
var pressT;
canvas.addEventListener('touchstart', function(){ pressT=setTimeout(function(){ paused=!paused; statusEl.textContent = paused?'动画已暂停':'动画已继续'; }, 600); }, {passive:true});
canvas.addEventListener('touchend', function(){ clearTimeout(pressT); }, {passive:true});
canvas.addEventListener('touchmove', function(){ clearTimeout(pressT); }, {passive:true});
canvas.addEventListener('mousedown', function(){ pressT=setTimeout(function(){ paused=!paused; }, 600); });
canvas.addEventListener('mouseup', function(){ clearTimeout(pressT); });

/* 初始布局 */
window.addEventListener('resize', function(){ if(particles.length) buildCloud(particles.map(function(p){return {name:p.name,qty:p.qty};})); });
layout();
renderHistory();

})();
