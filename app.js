/* ============ 食材流体云 app.js（灵动岛 · 单行可编辑版） ============ */
(function(){
'use strict';

var $ = function(id){ return document.getElementById(id); };
var statusEl = $('status'), tagsEl = $('tags'), emptyHint = $('emptyHint');
var metaEl = $('meta'), histEl = $('history');
var ingredientsTa = $('ingredients');
var listEl = $('list'), islandText = $('islandText'), islandCount = $('islandCount');
var resetBtn = $('resetBtn');

var currentItems = [];   // 当前清单 [{name,qty,weight,done}]
var doneCount = 0;

/* ---------- 通用食材词典（OCR 后匹配用，含常见易漏词） ---------- */
var DICT = [
  // 主食
  '米饭','大米','小米','面条','面粉','馒头','饺子','馄饨','汤圆','面包','燕麦','玉米','红薯','土豆粉','粉丝','米粉','糯米','薏米','粥','凉皮','油条','煎饼','包子','花卷','烧饼','年糕','粽子','蛋糕','饼干','薯条','炸鸡',
  // 肉类
  '猪肉','五花肉','里脊','排骨','牛肉','羊肉','鸡肉','鸭肉','鸡翅','鸡腿','鸡胸','鸡爪','鸭掌','腊肉','香肠','火腿','培根','午餐肉','肉末','肉丝','肉片','猪蹄','猪肝','猪肚','牛腩','牛腱','牛肚','肥牛','肥羊','鸡胗','内脏','鱼','鱼头','鱼片','鱼块','虾','虾仁','蟹','蟹肉棒','鱿鱼','贝','蛤蜊','花甲','扇贝','生蚝','带鱼','草鱼','鲈鱼','鲫鱼','龙利鱼','黄鱼','三文鱼',
  // 蔬菜
  '青菜','小白菜','大白菜','娃娃菜','菠菜','生菜','油麦菜','空心菜','上海青','芹菜','韭菜','香菜','葱','大葱','小葱','洋葱','蒜','大蒜','蒜薹','蒜苗','姜','生姜','辣椒','青椒','红椒','小米椒','尖椒','干辣椒','彩椒','番茄','西红柿','黄瓜','冬瓜','南瓜','苦瓜','丝瓜','西葫芦','茄子','胡萝卜','白萝卜','青萝卜','红萝卜','水萝卜','萝卜','土豆','山药','芋头','莲藕','藕','豆角','四季豆','扁豆','荷兰豆','豇豆','豌豆','毛豆','蚕豆','玉米','西兰花','花菜','菜花','卷心菜','包菜','紫甘蓝','芦笋','竹笋','冬笋','春笋','金针菇','香菇','蘑菇','杏鲍菇','平菇','木耳','银耳','海带','海带结','海带丝','紫菜','豆芽','黄豆芽','绿豆芽','秋葵','芥蓝','苋菜','茭白','蕨菜','苦菜','马齿苋',
  // 豆制品/蛋
  '豆腐','豆腐干','豆腐皮','豆干','腐竹','豆皮','千张','豆腐泡','油豆腐','豆泡','素鸡','面筋','鸡蛋','鸭蛋','鹌鹑蛋','皮蛋','咸蛋','松花蛋','蛋白','蛋黄',
  // 丸子类
  '丸子','肉丸','鱼丸','虾丸','牛肉丸','贡丸','狮子头','豆腐丸',
  // 调料
  '盐','糖','白糖','红糖','冰糖','酱油','生抽','老抽','蚝油','醋','陈醋','香醋','料酒','黄酒','白酒','十三香','五香粉','胡椒粉','花椒','八角','桂皮','香叶','孜然','辣椒面','豆瓣酱','甜面酱','番茄酱','沙拉酱','芝麻酱','花生酱','芥末','味精','鸡精','淀粉','生粉','芝麻油','香油','橄榄油','食用油','菜籽油','猪油','蜂蜜','柠檬','泡椒','腐乳','豆豉','咖喱','奶酪','芝士','黄油','奶油','椰浆','炼乳',
  // 水果
  '苹果','香蕉','橙子','橘子','柚子','梨','桃','葡萄','提子','西瓜','哈密瓜','草莓','蓝莓','猕猴桃','火龙果','芒果','菠萝','榴莲','椰子','樱桃','杨梅','荔枝','龙眼','柠檬','柿子','石榴','枣','红枣','枸杞','桂圆','山楂','无花果',
  // 干货
  '花生','核桃','杏仁','腰果','瓜子','芝麻','松子','板栗','香菇','干贝','虾米','瑶柱','枸杞',
  // 其他
  '牛奶','酸奶','奶粉','豆浆','豆腐脑','奶茶','可乐','啤酒','凉粉','冰粉','果冻','布丁','冰沙','冰淇淋'
];

/* ---------- 解析输入为 [{name, qty, weight}] ---------- */
function parseIngredients(text){
  var items = [];
  var lines = String(text||'').split(/[\n,，、;；]+/);
  lines.forEach(function(line){
    line = line.trim();
    if(!line) return;
    // 匹配 名称 + 数量/重量，如 "鸡蛋 3 个" "五花肉 300g" "两个番茄"
    var m = line.match(/^(.+?)\s*([0-9一二三四五六七八九十两半]+)\s*(个|枚|颗|根|条|只|斤|克|g|G|kg|KG|块|包|袋|勺|碗|片|瓣|头|束|把|毫升|升|罐|盒)?$/);
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

/* ---------- OCR：图片预处理增强（灰度 + 对比度 + 放大） ---------- */
function enhanceImage(img){
  var c = document.createElement('canvas');
  var w = img.naturalWidth || img.width, h = img.naturalHeight || img.height;
  // 限制最大边，过小放大到 2x 提升识别率
  var maxW = 1800; var sc = Math.min(1, maxW/w);
  if(w < 800) sc = Math.max(2, Math.min(900/w, 3));
  c.width = Math.round(w*sc); c.height = Math.round(h*sc);
  var ctx = c.getContext('2d');
  ctx.fillStyle='#fff'; ctx.fillRect(0,0,c.width,c.height);
  ctx.drawImage(img,0,0,c.width,c.height);
  var idata = ctx.getImageData(0,0,c.width,c.height);
  var d = idata.data;
  // 灰度 + 对比度增强 + 自适应二值化阈值（浅色背景字体加深）
  var useGray = true;
  for(var i=0;i<d.length;i+=4){
    var r=d[i], g=d[i+1], b=d[i+2];
    var gray = 0.299*r + 0.587*g + 0.114*b;
    // 轻度对比度
    var cv = (gray-128)*1.18 + 128;
    cv = cv<0?0:(cv>255?255:cv);
    d[i]=d[i+1]=d[i+2]=cv;
  }
  ctx.putImageData(idata,0,0);
  return c;
}

/* ---------- OCR 提取食材 ---------- */
var worker = null;
async function ocrImage(canvas){
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
  var res = await worker.recognize(canvas);
  return res.data.text;
}

/* ---------- 编辑距离（用于 OCR 容错匹配） ---------- */
function editDist(a, b){
  a = String(a); b = String(b);
  var m=a.length, n=b.length;
  if(Math.abs(m-n)>2) return 99;
  var dp=[];
  for(var i=0;i<=m;i++){ dp[i]=[i]; for(var j=1;j<=n;j++) dp[i][j]=0; }
  for(var j=0;j<=n;j++) dp[0][j]=j;
  for(i=1;i<=m;i++){
    for(j=1;j<=n;j++){
      var cost = a[i-1]===b[j-1]?0:1;
      dp[i][j] = Math.min(dp[i-1][j]+1, dp[i][j-1]+1, dp[i-1][j-1]+cost);
    }
  }
  return dp[m][n];
}

/* 从 OCR 文本中提取食材：
   按行/标点切成"单元"（保留名称与数量间的空格），
   先提取末尾数量，再对名称做词典精确匹配 → 编辑距离<=1 模糊纠错 → 像中文名词则兜底采纳 */
function extractFromText(text){
  var found = {};
  var unitsRe = /[0-9一二三四五六七八九十两半]+\s*[个枚颗根条只斤两克gGkgKG块包袋勺碗片瓣头束把毫升升罐盒]?/g;
  var units = String(text||'').split(/[\n\r，,。；;、]+/);
  units.forEach(function(unit){
    unit = unit.trim();
    if(!unit) return;
    // 提取末尾数量，如 "白萝卜 2根" -> qty="2根"
    var qty = '';
    var qm = unit.match(/([0-9一二三四五六七八九十两半]+\s*[个枚颗根条只斤两克gGkgKG块包袋勺碗片瓣头束把毫升升罐盒]?)\s*$/);
    if(qm){ qty = qm[1].replace(/\s+/g,''); }
    // 去掉所有数量词，得到名称候选
    var cand = unit.replace(unitsRe,'').replace(/^[*·•\-—\s]+/,'').replace(/[0-9.]+$/,'').trim();
    if(!cand) return;
    // ① 词典精确
    var name = null;
    if(DICT.indexOf(cand) > -1){
      name = cand;
    } else {
      // ② 编辑距离<=1 模糊纠错（处理 OCR 单字错误，如"胡萝下"→"胡萝卜"）
      var best=null, bestD=99;
      DICT.forEach(function(food){
        var d = editDist(cand, food);
        if(d < bestD){ bestD=d; best=food; }
      });
      if(bestD<=1 && best) name = best;
    }
    // ③ 兜底：不在词典但像中文名词（2~8 字）也采纳
    if(!name && cand.length>=2 && cand.length<=8 && /^[\u4e00-\u9fa5·]+$/.test(cand)){
      name = cand;
    }
    if(name && !found[name]) found[name] = {name:name, qty:qty, weight:0};
  });
  var out=[];
  Object.keys(found).forEach(function(k){ out.push(found[k]); });
  return out;
}

/* ==================================================================
   灵动岛 · 单行食材列表
   每行：食材名 | 数量输入框(可编辑) | 方形勾选框
   打✓后整行泡沫破灭消失
   ================================================================== */

function buildList(items){
  currentItems = items.map(function(it){ return {name:it.name, qty:it.qty, weight:it.weight||0, done:false}; });
  doneCount = 0;
  listEl.innerHTML='';
  if(!currentItems.length){
    var empty = document.createElement('div');
    empty.className='list-empty';
    empty.innerHTML='🧺<br>还没有内容<br>点击上方「生成流体云」';
    listEl.appendChild(empty);
  }
  currentItems.forEach(function(it, idx){ createRow(it, idx); });
  metaEl.textContent = '共 '+currentItems.length+' 种食材';
  renderTags(items);
  updateIsland();
  resetBtn.disabled = false;
}

/* 生成单行 */
function createRow(it, idx){
  var row = document.createElement('div');
  row.className='row-item';

  var name = document.createElement('div');
  name.className='r-name'; name.textContent = it.name;

  var qtyWrap = document.createElement('div');
  qtyWrap.className='r-qty';
  var input = document.createElement('input');
  input.type='text'; input.className='qty-input';
  input.value = it.qty || '';
  input.placeholder = '数量可修改';
  input.inputMode = 'text';
  // 修改数量实时同步
  input.addEventListener('input', function(){ currentItems[idx].qty = input.value; });
  input.addEventListener('click', function(e){ e.stopPropagation(); });
  qtyWrap.appendChild(input);

  var box = document.createElement('div');
  box.className='box'; box.textContent = '✓';

  row.appendChild(name);
  row.appendChild(qtyWrap);
  row.appendChild(box);
  row.dataset.name = it.name;

  row.addEventListener('click', function(){
    if(row.classList.contains('done') || row.classList.contains('pop')) return;
    row.classList.add('done');
    currentItems[idx].done = true;
    doneCount++;
    updateIsland();
    // 停顿后播放泡沫破灭并移除
    setTimeout(function(){
      row.classList.add('pop');
      setTimeout(function(){ 
        row.remove();
        if(doneCount >= currentItems.length){
          islandText.textContent = '全部准备好了！';
          islandCount.textContent = currentItems.length + '/' + currentItems.length;
        }
      }, 560);
    }, 480);
  });
  listEl.appendChild(row);
}

/* 灵动岛状态 */
function updateIsland(){
  var total = currentItems.length;
  islandCount.textContent = doneCount + '/' + total;
  if(!total){
    islandText.textContent = '准备食材';
    islandCount.style.color=''; islandCount.style.background='';
  } else if(doneCount >= total){
    islandText.textContent = '全部准备好了！';
    islandCount.style.color = '#06301d';
    islandCount.style.background = '#3dffa8';
  } else {
    islandText.textContent = (doneCount ? '已备好 '+doneCount+' 种' : '准备食材');
    islandCount.style.color=''; islandCount.style.background='';
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
  buildList(items);
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
    statusEl.textContent='正在增强图片，准备识别…';
    try{
      var canvas = enhanceImage(img);
      statusEl.textContent='开始识别图片…';
      var text = await ocrImage(canvas);
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
      buildList(merged);
      saveHistory(merged);
      statusEl.textContent='已识别 '+found.length+' 种食材，可直接在下方修改数量';
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
  buildList(items);
  saveHistory(items);
  statusEl.textContent='已生成食材清单，打 ✓ 删除对应项';
  statusEl.className='status done';
});
$('clearAll').addEventListener('click', function(){
  ingredientsTa.value=''; tagsEl.innerHTML='';
  currentItems=[]; doneCount=0;
  listEl.innerHTML='';
  var empty = document.createElement('div');
  empty.className='list-empty';
  empty.innerHTML='🧺<br>还没有内容<br>点击上方「生成流体云」';
  listEl.appendChild(empty);
  metaEl.textContent='共 0 种食材';
  resetBtn.disabled = true;
  updateIsland();
});
resetBtn.addEventListener('click', function(){
  // 重置进度：重新生成全部行（未勾状态）
  var items = currentItems.map(function(it){ return {name:it.name, qty:it.qty, weight:it.weight}; });
  buildList(items);
});

/* 初始 */
renderHistory();

})();
