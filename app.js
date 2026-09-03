/* ============ 食材流体云 app.js（共享逻辑 · 识别/生成/展示 三页版） ============ */
(function(){
'use strict';

/* 数据流（localStorage）：
   fc_candidates : 识别页产物 [{name,qty,weight}]      → 生成页读取为初始清单
   fc_active     : 生成页确认后的最终清单（含 done）   → 展示页展示
   fc_history    : 历史 [{time,names}] */

var keys = { candidates:'fc_candidates', active:'fc_active', history:'fc_history' };

/* ---------- 数据层 ---------- */
function getJSON(k, def){ try{ return JSON.parse(localStorage.getItem(k)) || def; }catch(e){ return def; } }
function setJSON(k, v){ localStorage.setItem(k, JSON.stringify(v)); }

function getCandidates(){ return getJSON(keys.candidates, []); }
function setCandidates(items){ setJSON(keys.candidates, items); }
function getActive(){ return getJSON(keys.active, []); }
function setActive(items){ setJSON(keys.active, items); }
function getHistory(){ return getJSON(keys.history, []); }
function addHistory(items){
  var arr = getHistory();
  arr.unshift({time:new Date().toLocaleString('zh-CN'), names:items.map(function(i){return i.name;})});
  arr = arr.slice(0,8);
  setJSON(keys.history, arr);
}

/* ---------- 通用食材词典 ---------- */
var DICT = [
  '米饭','大米','小米','面条','面粉','馒头','饺子','馄饨','汤圆','面包','燕麦','玉米','红薯','土豆粉','粉丝','米粉','糯米','薏米','粥','凉皮','油条','煎饼','包子','花卷','烧饼','年糕','粽子','蛋糕','饼干','薯条','炸鸡',
  '猪肉','五花肉','里脊','排骨','牛肉','羊肉','鸡肉','鸭肉','鸡翅','鸡腿','鸡胸','鸡爪','鸭掌','腊肉','香肠','火腿','培根','午餐肉','肉末','肉丝','肉片','猪蹄','猪肝','猪肚','牛腩','牛腱','牛肚','肥牛','肥羊','鸡胗','内脏','鱼','鱼头','鱼片','鱼块','虾','虾仁','蟹','蟹肉棒','鱿鱼','贝','蛤蜊','花甲','扇贝','生蚝','带鱼','草鱼','鲈鱼','鲫鱼','龙利鱼','黄鱼','三文鱼',
  '青菜','小白菜','大白菜','娃娃菜','菠菜','生菜','油麦菜','空心菜','上海青','芹菜','韭菜','香菜','葱','大葱','小葱','洋葱','蒜','大蒜','蒜薹','蒜苗','姜','生姜','辣椒','青椒','红椒','小米椒','尖椒','干辣椒','彩椒','番茄','西红柿','黄瓜','冬瓜','南瓜','苦瓜','丝瓜','西葫芦','茄子','胡萝卜','白萝卜','青萝卜','红萝卜','水萝卜','萝卜','土豆','山药','芋头','莲藕','藕','豆角','四季豆','扁豆','荷兰豆','豇豆','豌豆','毛豆','蚕豆','西兰花','花菜','菜花','卷心菜','包菜','紫甘蓝','芦笋','竹笋','冬笋','春笋','金针菇','香菇','蘑菇','杏鲍菇','平菇','木耳','银耳','海带','海带结','海带丝','紫菜','豆芽','黄豆芽','绿豆芽','秋葵','芥蓝','苋菜','茭白','蕨菜','苦菜','马齿苋',
  '豆腐','豆腐干','豆腐皮','豆干','腐竹','豆皮','千张','豆腐泡','油豆腐','豆泡','素鸡','面筋','鸡蛋','鸭蛋','鹌鹑蛋','皮蛋','咸蛋','松花蛋','蛋白','蛋黄',
  '丸子','肉丸','鱼丸','虾丸','牛肉丸','贡丸','狮子头','豆腐丸',
  '盐','糖','白糖','红糖','冰糖','酱油','生抽','老抽','蚝油','醋','陈醋','香醋','料酒','黄酒','白酒','十三香','五香粉','胡椒粉','花椒','八角','桂皮','香叶','孜然','辣椒面','豆瓣酱','甜面酱','番茄酱','沙拉酱','芝麻酱','花生酱','芥末','味精','鸡精','淀粉','生粉','芝麻油','香油','橄榄油','食用油','菜籽油','猪油','蜂蜜','柠檬','泡椒','腐乳','豆豉','咖喱','奶酪','芝士','黄油','奶油','椰浆','炼乳',
  '苹果','香蕉','橙子','橘子','柚子','梨','桃','葡萄','提子','西瓜','哈密瓜','草莓','蓝莓','猕猴桃','火龙果','芒果','菠萝','榴莲','椰子','樱桃','杨梅','荔枝','龙眼','柿子','石榴','枣','红枣','枸杞','桂圆','山楂','无花果',
  '花生','核桃','杏仁','腰果','瓜子','芝麻','松子','板栗','干贝','虾米','瑶柱',
  '牛奶','酸奶','奶粉','豆浆','豆腐脑','奶茶','可乐','啤酒','凉粉','冰粉','果冻','布丁','冰沙','冰淇淋'
];

/* ---------- 文本解析（手动输入用） ---------- */
function chineseNumToInt(s){
  var map = {'一':1,'二':2,'两':2,'三':3,'四':4,'五':5,'六':6,'七':7,'八':8,'九':9,'十':10,'半':0.5};
  var n = 0;
  for(var i=0;i<String(s).length;i++){ n = n*10 + (map[s[i]]||0); }
  return n;
}
function parseIngredients(text){
  var items = [];
  var lines = String(text||'').split(/[\n,，、;；]+/);
  lines.forEach(function(line){
    line = line.trim();
    if(!line) return;
    var m = line.match(/^(.+?)\s*([0-9一二三四五六七八九十两半]+)\s*(个|枚|颗|根|条|只|斤|克|g|G|kg|KG|块|包|袋|勺|碗|片|瓣|头|束|把|毫升|升|罐|盒|朵|株|捆|篮)?$/);
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
function dedup(arr){
  var seen = {}, out = [];
  arr.forEach(function(it){
    var k = it.name.trim();
    if(!k || seen[k]) return;
    seen[k]=1; out.push(it);
  });
  return out;
}

/* ---------- OCR：图片预处理 ---------- */
function enhanceImage(img){
  var c = document.createElement('canvas');
  var w = img.naturalWidth || img.width, h = img.naturalHeight || img.height;
  var maxW = 1800; var sc = Math.min(1, maxW/w);
  if(w < 800) sc = Math.max(2, Math.min(900/w, 3));
  c.width = Math.round(w*sc); c.height = Math.round(h*sc);
  var ctx = c.getContext('2d');
  ctx.fillStyle='#fff'; ctx.fillRect(0,0,c.width,c.height);
  ctx.drawImage(img,0,0,c.width,c.height);
  var idata = ctx.getImageData(0,0,c.width,c.height);
  var d = idata.data;
  for(var i=0;i<d.length;i+=4){
    var r=d[i], g=d[i+1], b=d[i+2];
    var gray = 0.299*r + 0.587*g + 0.114*b;
    var cv = (gray-128)*1.18 + 128;
    cv = cv<0?0:(cv>255?255:cv);
    d[i]=d[i+1]=d[i+2]=cv;
  }
  ctx.putImageData(idata,0,0);
  return c;
}

var worker = null;
async function ocrImage(canvas, onStatus){
  if(!window.Tesseract){ throw new Error('OCR 引擎未加载，请检查网络后重试'); }
  if(onStatus) onStatus('正在加载离线中文识别引擎…');
  if(!worker){
    worker = await Tesseract.createWorker('chi_sim', 1, {
      langPath: './lib/lang',
      logger: function(m){
        if(m.status==='recognizing text' && onStatus){
          onStatus('正在识别文字：' + Math.round(m.progress*100) + '%');
        }
      }
    });
  }
  if(onStatus) onStatus('正在识别文字…');
  var res = await worker.recognize(canvas);
  return res.data.text;
}

/* ---------- OCR 容错 ---------- */
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
var OCR_MAP = {
  'ト':'卜','丅':'卜','籮':'萝','羅':'萝','薐':'萝','箉':'笋',
  '見':'见','貝':'贝','問':'问','間':'间','說':'说','話':'话'
};
var FOOD_ALIAS = {
  '胡罗ト':'胡萝卜','胡罗卜':'胡萝卜','胡羅ト':'胡萝卜','胡羅卜':'胡萝卜','胡箩卜':'胡萝卜','葫萝卜':'胡萝卜','胡萝ト':'胡萝卜','胡萝下':'胡萝卜','葫罗ト':'胡萝卜','葫羅ト':'胡萝卜','胡薐ト':'胡萝卜',
  '白罗卜':'白萝卜','白羅卜':'白萝卜','紅萝卜':'红萝卜','红罗卜':'红萝卜','青羅卜':'青萝卜','水羅卜':'水萝卜',
  '箩卜':'萝卜','羅卜':'萝卜','罗卜':'萝卜','薐卜':'萝卜',
  '西红设':'西红柿','西紅柿':'西红柿','番茄':'西红柿','西紅设':'西红柿',
  '火煺':'火腿','火退':'火腿','四条':'四季豆','香茹':'香菇','海带缜':'海带结','海带时':'海带结','海带节':'海带结','平果':'苹果'
};
function normChar(c){ return OCR_MAP[c] || c; }
function normalizeWord(w){ return String(w).split('').map(normChar).join(''); }
var CN_RE = /^[\u4e00-\u9fa5]+$/;

function extractFromText(text){
  var t = String(text||'');
  var found = {};
  var normDict = DICT.map(normalizeWord);
  var maxL = 6;
  var compact = normalizeWord(t.replace(/[\s\u3000、，,。；;·•\-—_*:：()（）【】[\]"'"“”]+/g,''));
  var i = 0, lastName = null, pendingQty = null;
  function resolve(piece){
    if(!piece) return null;
    if(FOOD_ALIAS[piece]) return FOOD_ALIAS[piece];
    var np = normalizeWord(piece);
    if(FOOD_ALIAS[np]) return FOOD_ALIAS[np];
    var idx = normDict.indexOf(np);
    if(idx > -1) return DICT[idx];
    return null;
  }
  function commit(name, qty){
    if(!qty && pendingQty){ qty = pendingQty; pendingQty = null; }
    if(found[name]){ if(qty) found[name].qty = qty; }
    else { found[name] = {name:name, qty:qty||'', weight:0}; }
    lastName = name;
  }
  while(i < compact.length){
    var ch = compact.charAt(i);
    // ① 数字 → 数量
    if(/[0-9一二三四五六七八九十两半]/.test(ch)){
      var dm = compact.substr(i).match(/^([0-9]+|[一二三四五六七八九十两半]+)(个|枚|颗|根|条|只|斤|两|克|g|G|kg|KG|块|包|袋|勺|碗|片|瓣|头|束|把|毫升|升|罐|盒|朵|株|捆|篮)?/);
      if(dm){
        var q = dm[0];
        if(dm[2]){
          // 完整"数字+单位" → 数量（归属前一食材；无则暂存给下个食材）
          if(lastName){ commit(lastName, q); }
          else { pendingQty = q; }
          i += q.length;
          continue;
        } else if(/^[0-9]+$/.test(dm[1])){
          // 纯阿拉伯数字（如"3苹果"前置数量）→ 暂存
          pendingQty = dm[1];
          i += dm[1].length;
          continue;
        }
        // 中文数字且无单位（如"五花"、"两"）→ 不消费，交给下方中文整词匹配
      }
    }
    var matched=null, matchedLen=0;
    for(var L=Math.min(maxL, compact.length-i); L>=1; L--){
      var piece = compact.substr(i, L);
      var nm = resolve(piece);
      if(nm){ matched=nm; matchedLen=L; break; }
    }
    if(matched){
      commit(matched, '');
      lastName = matched;
      i += matchedLen;
    } else { i++; }
  }
  var out=[];
  Object.keys(found).forEach(function(k){ out.push(found[k]); });
  return out;
}

/* ---------- 共享 UI 工具 ---------- */
function setStatus(el, msg, type){
  if(!el) return;
  el.className = 'status' + (type?(' '+type):'');
  el.textContent = msg;
}
function renderChips(el, names){
  if(!el) return;
  el.innerHTML='';
  names.forEach(function(n){
    var c=document.createElement('span'); c.className='chip'; c.textContent=n; el.appendChild(c);
  });
}
function renderHistory(histEl, emptyMsg){
  if(!histEl) return;
  var arr = getHistory();
  if(!arr.length){ histEl.innerHTML='<p class="hint">'+(emptyMsg||'暂无历史记录')+'</p>'; return; }
  histEl.innerHTML='';
  arr.forEach(function(h){
    var d=document.createElement('div'); d.className='hist-item';
    var t=document.createElement('div'); t.className='h-time';
    t.textContent = h.time + ' · '+h.names.length+' 种';
    h.names.forEach(function(n){
      var c=document.createElement('span'); c.className='chip'; c.textContent=n; d.appendChild(c);
    });
    d.appendChild(t); histEl.appendChild(d);
  });
}
/* 底部导航高亮 */
function setTab(cur){
  var links = document.querySelectorAll('.tabbar a[data-tab]');
  for(var i=0;i<links.length;i++){
    links[i].classList.toggle('on', links[i].getAttribute('data-tab')===cur);
  }
}
/* 通用：图片选择 → OCR */
function bindImageInput(inputId, onText){
  var el = document.getElementById(inputId);
  if(!el) return;
  el.addEventListener('change', function(e){
    var file = e.target.files[0];
    e.target.value='';
    if(!file) return;
    onText(file);
  });
}

/* ==================================================================
   页面 ①  识别页（scan.html）
   ================================================================== */
function initScan(){
  var statusEl = document.getElementById('status');
  var previewEl = document.getElementById('preview');
  var tagsEl = document.getElementById('tags');
  var nextBtn = document.getElementById('nextBtn');
  var counters = document.getElementById('counters');

  var current = getCandidates(); // 已有候选

  function refresh(candidates){
    current = candidates;
    setCandidates(candidates);
    if(tagsEl){
      tagsEl.innerHTML='';
      candidates.forEach(function(it, i){
        var s=document.createElement('span'); s.className='tag';
        s.textContent = it.name + (it.qty?(' '+it.qty):'');
        var rm=document.createElement('button'); rm.textContent='×';
        rm.onclick=function(){ candidates.splice(i,1); refresh(candidates); };
        s.appendChild(rm); tagsEl.appendChild(s);
      });
    }
    if(counters){ counters.textContent = '当前已识别 '+candidates.length+' 种食材'; }
    if(nextBtn){ nextBtn.disabled = !candidates.length; }
  }

  function loadImage(file){
    if(!file) return;
    if(!/^image/.test(file.type)){ setStatus(statusEl,'请选择图片文件','err'); return; }
    var url = URL.createObjectURL(file);
    var img = new Image();
    img.onload = async function(){
      previewEl.style.display='block'; previewEl.innerHTML='';
      previewEl.appendChild(img);
      setStatus(statusEl,'正在增强图片，准备识别…');
      try{
        var canvas = enhanceImage(img);
        setStatus(statusEl,'开始识别图片…');
        var text = await ocrImage(canvas, function(m){ setStatus(statusEl, m); });
        setStatus(statusEl,'识别完成，正在提取食材…','done');
        var found = extractFromText(text);
        if(!found.length){
          setStatus(statusEl,'未识别到食材词，请检查图片清晰度，或改用手动输入。','err');
          return;
        }
        // 合并去重
        var map = {};
        current.concat(found).forEach(function(it){ if(!map[it.name]) map[it.name]=it; });
        var merged = Object.keys(map).map(function(k){ return map[k]; });
        refresh(merged);
        setStatus(statusEl,'已识别 '+found.length+' 种食材，点「去生成清单」继续', 'done');
      }catch(e){
        setStatus(statusEl,'识别失败：'+e.message,'err');
      }
    };
    img.src = url;
  }

  bindImageInput('camera-input', loadImage);
  bindImageInput('gallery-input', loadImage);
  refresh(current);

  var histEl = document.getElementById('history');
  renderHistory(histEl, '暂无历史记录');
  setTab('scan');

  if(nextBtn){
    nextBtn.addEventListener('click', function(){
      if(current.length) location.href='edit.html';
    });
  }
}

/* ==================================================================
   页面 ②  生成页（edit.html）
   ================================================================== */
function initEdit(){
  var statusEl = document.getElementById('status');
  var ta = document.getElementById('ingredients');
  var listWrap = document.getElementById('editList');
  var countEl = document.getElementById('count');
  var genBtn = document.getElementById('generateBtn');

  var candidates = getCandidates();
  var items = [];   // 编辑中的清单 [{name,qty,weight}]

  function parseToItems(){
    // 手动输入文本 + 识别候选 合并
    var fromText = parseIngredients(ta.value);
    var map = {};
    fromText.concat(candidates).forEach(function(it){ if(!map[it.name]) map[it.name]=it; });
    items = Object.keys(map).map(function(k){ return map[k]; });
    refreshList();
  }
  function refreshList(){
    listWrap.innerHTML='';
    if(!items.length){
      listWrap.innerHTML='<p class="hint" style="text-align:center;padding:18px 0;">暂无食材<br>可点击上方「引入识别结果」或直接输入</p>';
    }
    items.forEach(function(it, idx){
      var row=document.createElement('div'); row.className='edit-item';
      var nm=document.createElement('div'); nm.className='e-name'; nm.textContent=it.name;
      var qWrap=document.createElement('div'); qWrap.className='e-qty';
      var inp=document.createElement('input'); inp.type='text'; inp.className='qty-input'; inp.value=it.qty||''; inp.placeholder='数量可改';
      inp.addEventListener('input', function(){ it.qty = inp.value; });
      qWrap.appendChild(inp);
      var del=document.createElement('button'); del.className='e-del'; del.textContent='×';
      del.onclick=function(){ items.splice(idx,1); refreshList(); };
      row.appendChild(nm); row.appendChild(qWrap); row.appendChild(del);
      listWrap.appendChild(row);
    });
    if(countEl) countEl.textContent = items.length;
    if(genBtn) genBtn.disabled = !items.length;
  }
  function toText(){
    return items.map(function(it){ return it.name + (it.qty?(' '+it.qty):''); }).join('、');
  }

  var txtBtn = document.getElementById('parseBtn');
  if(txtBtn) txtBtn.addEventListener('click', function(){ parseToItems(); setStatus(statusEl,'已解析输入文本','done'); });
  var cbBtn = document.getElementById('candBtn');
  if(cbBtn){
    cbBtn.addEventListener('click', function(){
      var c = getCandidates();
      if(!c.length){ setStatus(statusEl,'暂无可引入的识别结果，请先在「识别页」拍照','err'); return; }
      var map={};
      items.concat(c).forEach(function(it){ if(!map[it.name]) map[it.name]=it; });
      items = Object.keys(map).map(function(k){ return map[k]; });
      refreshList();
      setStatus(statusEl,'已引入识别结果 '+'种'.replace('种',''),'done');
      setStatus(statusEl,'已引入识别结果 '+c.length+' 种食材','done');
    });
  }
  var clearBtn = document.getElementById('clearBtn');
  if(clearBtn) clearBtn.addEventListener('click', function(){
    ta.value=''; items=[]; refreshList(); setStatus(statusEl,'已清空','');
  });

  if(genBtn){
    genBtn.addEventListener('click', function(){
      if(!items.length){ setStatus(statusEl,'请先添加食材','err'); return; }
      var finalItems = items.map(function(it){ return {name:it.name, qty:it.qty, weight:it.weight||0, done:false}; });
      setActive(finalItems);
      addHistory(finalItems);
      setCandidates([]); // 清除候选，避免下次重复
      location.href='show.html';
    });
  }

  // 初始化：预填候选
  if(candidates.length){
    ta.value = candidates.map(function(it){ return it.name+(it.qty?(' '+it.qty):''); }).join('、');
    items = candidates.map(function(it){ return {name:it.name, qty:it.qty, weight:it.weight||0}; });
    refreshList();
    setStatus(statusEl,'已带入识别结果，可编辑后生成','done');
  } else {
    refreshList();
  }
  setTab('edit');
}

/* ==================================================================
   页面 ③  展示页（show.html）
   ================================================================== */
function initShow(){
  var statusEl = document.getElementById('status');
  var listEl = document.getElementById('list');
  var emptyHint = document.getElementById('emptyHint');
  var islandText = document.getElementById('islandText');
  var islandCount = document.getElementById('islandCount');
  var metaEl = document.getElementById('meta');
  var resetBtn = document.getElementById('resetBtn');

  var currentItems = getActive();
  var doneCount = 0;

  function updateIsland(){
    var total = currentItems.length;
    islandCount.textContent = doneCount + '/' + total;
    if(!total){ islandText.textContent='准备食材';
      islandCount.style.color=''; islandCount.style.background='';
    } else if(doneCount>=total){
      islandText.textContent='全部准备好了！';
      islandCount.style.color='#06301d'; islandCount.style.background='#3dffa8';
    } else {
      islandText.textContent = (doneCount ? '已备好 '+doneCount+' 种' : '准备食材');
      islandCount.style.color=''; islandCount.style.background='';
    }
  }
  function createRow(it, idx){
    var row=document.createElement('div'); row.className='row-item';
    var name=document.createElement('div'); name.className='r-name'; name.textContent=it.name;
    var qWrap=document.createElement('div'); qWrap.className='r-qty';
    var input=document.createElement('input'); input.type='text'; input.className='qty-input';
    input.value=it.qty||''; input.placeholder='数量可修改'; input.inputMode='text';
    input.addEventListener('input', function(){ currentItems[idx].qty=input.value; save(); });
    input.addEventListener('click', function(e){ e.stopPropagation(); });
    qWrap.appendChild(input);
    var box=document.createElement('div'); box.className='box'; box.textContent='✓';
    row.appendChild(name); row.appendChild(qWrap); row.appendChild(box);
    row.addEventListener('click', function(){
      if(row.classList.contains('done')||row.classList.contains('pop')) return;
      row.classList.add('done');
      currentItems[idx].done=true; doneCount++; save(); updateIsland();
      setTimeout(function(){
        row.classList.add('pop');
        setTimeout(function(){ row.remove(); save(); if(doneCount>=currentItems.length){ islandText.textContent='全部准备好了！'; islandCount.textContent=currentItems.length+'/'+currentItems.length; } }, 560);
      }, 480);
    });
    listEl.appendChild(row);
  }
  function save(){ setActive(currentItems); }
  function build(){
    listEl.innerHTML='';
    doneCount = currentItems.filter(function(it){ return !!it.done; }).length;
    if(!currentItems.length){
      var empty=document.createElement('div'); empty.className='list-empty';
      empty.innerHTML='🧺<br>还没有内容<br>请先到「生成页」生成清单';
      listEl.appendChild(empty);
      islandText.textContent='准备食材';
      resetBtn.disabled = true;
    }
    currentItems.forEach(function(it, idx){ createRow(it, idx); if(it.done) listEl.lastChild.classList.add('done'); });
    metaEl.textContent = '共 '+currentItems.length+' 种食材';
    resetBtn.disabled = false;
    updateIsland();
  }
  if(resetBtn){
    resetBtn.addEventListener('click', function(){
      currentItems.forEach(function(it){ it.done=false; });
      save(); build();
      setStatus(statusEl,'已重置进度','done');
    });
  }
  build();
  if(!currentItems.length){ setStatus(statusEl,'请先在「生成页」生成食材清单',''); }
  setTab('show');
}

/* ---------- 首页（index.html） ---------- */
function initHome(){
  var active = getActive();
  var cont = document.getElementById('continueCard');
  var historyEl = document.getElementById('homeHistory');
  if(active && active.length){
    if(cont){
      cont.style.display='flex';
      var names = active.map(function(i){return i.name;}).join('、');
      document.getElementById('contInfo').textContent = '继续进行：'+names;
    }
  } else if(cont){ cont.style.display='none'; }
  renderHistory(historyEl, '暂无历史记录，快去识别第一份食材吧');
}

/* ---------- 导出 ---------- */
window.FC = {
  initScan:initScan, initEdit:initEdit, initShow:initShow, initHome:initHome,
  getCandidates:getCandidates, setCandidates:setCandidates,
  getActive:getActive, setActive:setActive,
  extractFromText:extractFromText
};

/* OCR 引擎备用源 */
if(window.Tesseract === undefined){
  var s=document.createElement('script');
  s.src='https://cdn.jsdelivr.net/npm/tesseract.js@5/dist/tesseract.min.js';
  document.head.appendChild(s);
}

})();
