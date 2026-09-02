/* ============ 食材流体云 app.js（灵动岛版） ============ */
(function(){
'use strict';

var $ = function(id){ return document.getElementById(id); };
var statusEl = $('status'), tagsEl = $('tags'), emptyHint = $('emptyHint');
var metaEl = $('meta'), histEl = $('history');
var ingredientsTa = $('ingredients');
var cloudEl = $('cloud'), islandText = $('islandText'), islandCount = $('islandCount');
var resetBtn = $('resetBubbles');

var currentItems = [];   // 当前气泡数据 [{name,qty,weight,done}]
var doneCount = 0;

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

/* 从 OCR 文本中提取食材（词典匹配） */
function extractFromText(text){
  var found = [];
  DICT.forEach(function(food){
    if(text.indexOf(food) > -1){
      found.push({name: food, qty:'', weight:0});
    }
  });
  return dedup(found);
}

/* ==================================================================
   灵动岛 · 流体气泡
   每个食材 = 一个玻璃气泡，轻点 → 打✓ → 泡沫破灭动画 → 消失
   ================================================================== */
var BUBBLE_COLORS = ['#5ec8ff','#7dffd4','#ffd27d','#ff9ad5','#b08cff','#8effd0','#ffc1a1'];

function buildBubbles(items){
  currentItems = items.map(function(it){ return {name:it.name, qty:it.qty, done:false}; });
  doneCount = 0;
  cloudEl.innerHTML = '';
  if(!currentItems.length){
    var empty = document.createElement('div');
    empty.className='cloud-empty';
    empty.innerHTML='🧺<br>还没有内容<br>点击上方「生成流体云」';
    cloudEl.appendChild(empty);
    emptyHint.style.display='none';
  } else {
    emptyHint.style.display='none';
    currentItems.forEach(createBubble);
  }
  metaEl.textContent = '共 '+currentItems.length+' 种食材';
  renderTags(items);
  updateIsland();
  resetBtn.disabled = false;
}

/* 生成单个气泡 DOM */
function createBubble(it){
  var b = document.createElement('div');
  b.className='bubble';
  var c = BUBBLE_COLORS[Math.floor(Math.random()*BUBBLE_COLORS.length)];
  // 随机浮动动画参数
  b.style.setProperty('--fd', (4 + Math.random()*3).toFixed(2)+'s');
  b.style.setProperty('--fs', (-Math.random()*4).toFixed(2)+'s');

  var check = document.createElement('div');
  check.className='b-check'; check.textContent='✓';

  var info = document.createElement('div');
  var nm = document.createElement('div');
  nm.className='b-name'; nm.textContent = it.name;
  info.appendChild(nm);
  if(it.qty){
    var q = document.createElement('div');
    q.className='b-qty'; q.textContent = it.qty;
    info.appendChild(q);
  }

  b.appendChild(check);
  b.appendChild(info);
  b.dataset.name = it.name;

  b.addEventListener('click', function(){
    if(b.classList.contains('pop')) return;
    if(b.classList.contains('done')) return; // 已确认，不再重复计
    b.classList.add('done');
    it.done = true;
    doneCount++;
    updateIsland();
    // 0.55s 后播放泡沫破灭并移除
    setTimeout(function(){
      b.classList.add('pop');
      setTimeout(function(){ b.remove(); }, 560);
    }, 450);
  });
  cloudEl.appendChild(b);
}

/* 灵动岛状态 */
function updateIsland(){
  var total = currentItems.length;
  islandCount.textContent = doneCount + '/' + total;
  if(!total){
    islandText.textContent = '准备食材';
  } else if(doneCount >= total){
    islandText.textContent = '全部准备好了！';
    islandCount.style.color = '#06301d';
    islandCount.style.background = '#3dffa8';
  } else {
    islandText.textContent = (doneCount ? '已备好 '+doneCount+' 种' : '准备食材');
    islandCount.style.color = '';
    islandCount.style.background = '';
  }
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
  buildBubbles(items);
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
      buildBubbles(merged);
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
  arr.forEach(function(h){
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
  buildBubbles(items);
  saveHistory(items);
  statusEl.textContent='已生成灵动岛气泡';
  statusEl.className='status done';
});
$('clearAll').addEventListener('click', function(){
  ingredientsTa.value=''; tagsEl.innerHTML='';
  currentItems=[]; doneCount=0;
  cloudEl.innerHTML='';
  var empty = document.createElement('div');
  empty.className='cloud-empty';
  empty.innerHTML='🧺<br>还没有内容<br>点击上方「生成流体云」';
  cloudEl.appendChild(empty);
  metaEl.textContent='共 0 种食材';
  resetBtn.disabled = true;
  updateIsland();
});
resetBtn.addEventListener('click', function(){
  // 重置进度：恢复所有气泡为未勾选
  currentItems.forEach(function(it){ it.done = false; });
  doneCount = 0;
  var els = cloudEl.querySelectorAll('.bubble');
  els.forEach(function(b){ b.classList.remove('done','pop'); });
  updateIsland();
});

/* 初始 */
renderHistory();

})();
