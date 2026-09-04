/* ============ 流体小票 app.js（共享逻辑 · 识别/生成/展示 三页版） ============ */
(function(){
'use strict';

/* 数据流（localStorage）：
   fc_candidates : 识别页产物 [{name,qty,weight}]      → 生成页读取为初始清单
   fc_active     : 生成页确认后的最终清单（含 done）   → 展示页展示
   fc_history    : 历史 [{time,names,items}]          → 可下拉查看并跳转恢复 */

var keys = { candidates:'fc_candidates', active:'fc_active', history:'fc_history', cats:'fc_cats', meta:'fc_meta' };

/* ---------- 数据层 ---------- */
function getJSON(k, def){ try{ return JSON.parse(localStorage.getItem(k)) || def; }catch(e){ return def; } }
function setJSON(k, v){ localStorage.setItem(k, JSON.stringify(v)); }

function getCandidates(){ return getJSON(keys.candidates, []); }
function setCandidates(items){ setJSON(keys.candidates, items); }
function getActive(){ return getJSON(keys.active, []); }
function setActive(items){ setJSON(keys.active, items); }
function getHistory(){ return getJSON(keys.history, []); }

/* 清单自动命名：根据识别/清单内的食材自动取名（可编辑） */
function autoName(items){
  var names = (items||[]).map(function(i){ return (i&&i.name)||''; }).filter(Boolean);
  if(!names.length) return '未命名清单';
  var head = names.slice(0,3).join('、');
  return names.length>3 ? (head+' 等 '+names.length+' 种') : head;
}

/* 清单分类库（本地“数据库”）：内置常用分类 + 用户自定义，存 localStorage */
var DEFAULT_CATS = ['炒菜','炖菜','煮汤','煲汤','蒸菜','凉拌','红烧','烧烤','油炸','甜品','面食','粥类','火锅','凉菜','汤羹','其他'];
function getCats(){
  var c = getJSON(keys.cats, []);
  var seen = {}, out = [];
  DEFAULT_CATS.concat(c).forEach(function(x){
    x = String(x||'').trim();
    if(x && !seen[x]){ seen[x]=1; out.push(x); }
  });
  return out;
}
function addCat(name){
  name = String(name||'').trim();
  if(!name) return null;
  var all = getCats();
  if(all.indexOf(name) > -1) return name;
  var c = getJSON(keys.cats, []);
  c.push(name);
  setJSON(keys.cats, c);
  return name;
}

/* 清单元信息（名称/分类）：与 active 并行存储，供展示页显示 */
function getMeta(){ return getJSON(keys.meta, {}) || {}; }
function setMeta(m){ setJSON(keys.meta, m || {}); }

function addHistory(items, name, cat){
  var arr = getHistory();
  arr.unshift({
    time:new Date().toLocaleString('zh-CN'),
    name:(name||autoName(items)),
    cat:(cat||''),
    names:items.map(function(i){return i.name;}),
    items:items.map(function(i){return {name:i.name, qty:i.qty||'', weight:i.weight||0};})
  });
  arr = arr.slice(0,12);
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

/* ---------- 识别库扩充：日常蔬菜 / 调料（追加进词典，覆盖面更全） ---------- */
DICT = DICT.concat([
  // 更多叶菜·茎菜
  '菜心','奶白菜','红菜苔','紫菜苔','芥菜','雪里蕻','苦菊','茼蒿','菊花菜','木耳菜','菠菜根','番薯叶','红薯叶','南瓜尖','青蒜','蒜黄','韭黄','韭苔','韭菜花','香椿','薄荷','紫苏','鱼腥草','折耳根','笋尖','豌豆尖','豆苗','萝卜苗','莴笋','莴苣','儿菜','棒菜','瓢儿白','圆生菜','羽衣甘蓝','冰菜','凉薯','洋姜','鬼子姜','苤蓝','马蹄','茨菇','菱角','莲蓬','秋葵','蛇豆','荠菜','榨菜','雪菜','梅干菜','贡菜',
  // 更多瓜果豆
  '水果玉米','糯玉米','贝贝南瓜','老南瓜','佛手瓜','瓠瓜','葫芦瓜','苦瓜干','木瓜','菜椒','线椒','杭椒','螺丝椒','美人椒','泡椒','野山椒','朝天椒','干辣椒面','彩椒','灯笼椒','青尖椒',
  '荷兰豆','甜豆','刀豆','油豆角','芸豆','眉豆','鹰嘴豆','蚕豆米','青豆','红豆','绿豆','黑豆','黄豆','鹰嘴豆',
  // 更多菌菇·干货
  '茶树菇','蟹味菇','白玉菇','海鲜菇','猴头菇','虫草花','牛肝菌','松茸','鸡枞菌','香菇干','冬菇','花菇','口蘑','松蘑','羊肚菌','榆黄蘑','竹荪','香菇柄',
  '腐竹','响铃','油麦','豆皮卷','素火腿','水面筋','烤麸','面藕',
  // 调料扩充
  '孜然粉','黑胡椒','白胡椒','胡椒','花椒粉','辣椒粉','椒盐','花椒油','藤椒油','辣椒油','红油','蒜蓉','姜末','蒜末','葱花','蒸鱼豉油','豉油','味极鲜','海鲜酱','蒜蓉辣酱','烧烤酱','叉烧酱','排骨酱','柱侯酱','黄豆酱','黄豆瓣','剁椒','辣椒酱','郫县豆瓣','南乳','红腐乳','白腐乳','糟卤','米酒','醪糟','白醋','米醋','寿司醋','绵白糖','糖粉','麦芽糖','鱼露','虾酱','浓汤宝','高汤','骨头汤','鸡粉','蘑菇精','蔬菜精','咖喱粉','沙茶酱','麻酱','花生碎','白芝麻','黑芝麻','茴香','丁香','草果','白芷','陈皮','甘草','罗汉果','党参','当归','黄芪','砂仁','豆蔻','白豆蔻','迷迭香','百里香','罗勒','海苔','芥末酱','照烧汁','黑胡椒酱','蛋黄酱','千岛酱','油醋汁','蒜粉','洋葱粉','苏打粉','泡打粉','小苏打','酵母','吉利丁','木薯淀粉','玉米淀粉','番茄膏','番茄沙司','椰蓉','椰丝','奥利奥碎',
  // 更多蛋奶·荤
  '鸡小腿','琵琶腿','鸭腿','鹅','乳鸽','猪腰','猪心','猪肺','肥肠','大肠','小肠','毛肚','黄喉','鸭血','猪血','血豆腐','牛百叶','牛杂','羊杂','鸡杂',
  '鸡蛋白','咸蛋黄','茶叶蛋','卤蛋','蛋挞','荷包蛋','水煮蛋',
  // 更多水果·坚果·干果
  '哈密瓜','白兰瓜','木瓜','蟠桃','油桃','大力果','山竹','菠萝蜜','红毛丹','金桔','青柠','西柚','百香果','牛油果','人参果','释迦','车厘子','草莓果','玫瑰香','桑葚','乌梅','话梅','陈皮梅','杏干','桃干','葡萄干','蔓越莓','蓝莓干','开心果','碧根果','夏威夷果','山核桃','榛子','南瓜子','西瓜子','葵花籽','黑白芝麻',
  // 主食·其它
  '馒头片','花卷','糖三角','窝头','玉米面','荞麦面','全麦粉','意面','通心粉','乌冬面','河粉','米线','酸辣粉','面片','疙瘩汤','疙瘩','朝鲜冷面','云吞','抄手','生煎','锅贴','麻花','撒子','桃酥','绿豆糕','米糕','发糕','糍粑','青团','艾粑','汤圆粉','藕粉','葛根粉'
]);

/* ---------- OCR 形近字（字形级，高置信） ---------- */
var OCR_MAP = {
  'ト':'卜','丅':'卜','籮':'萝','羅':'萝','薐':'萝','箉':'笋','筍':'笋',
  '見':'见','貝':'贝','問':'问','間':'间','說':'说','話':'话'
};

/* ---------- 食材别名 / 常见 OCR 错误变体（词级，兼容手写与模糊字体） ---------- */
var FOOD_ALIAS = {
  '胡罗ト':'胡萝卜','胡罗卜':'胡萝卜','胡羅ト':'胡萝卜','胡羅卜':'胡萝卜','胡箩卜':'胡萝卜','葫萝卜':'胡萝卜','胡萝ト':'胡萝卜','胡萝下':'胡萝卜','葫罗ト':'胡萝卜','葫羅ト':'胡萝卜','胡薐ト':'胡萝卜','胡芦卜':'胡萝卜',
  '白罗卜':'白萝卜','白羅卜':'白萝卜','紅萝卜':'红萝卜','红罗卜':'红萝卜','青羅卜':'青萝卜','水羅卜':'水萝卜',
  '箩卜':'萝卜','羅卜':'萝卜','罗卜':'萝卜','薐卜':'萝卜','羅ト':'萝卜',
  '西红设':'西红柿','西紅柿':'西红柿','番茄':'西红柿','西紅设':'西红柿','西红榭':'西红柿','洋柿子':'番茄',
  '火煺':'火腿','火退':'火腿','四条':'四季豆','香茹':'香菇','海带缜':'海带结','海带时':'海带结','海带节':'海带结','平果':'苹果',
  '冬爪':'冬瓜','南爪':'南瓜','黄爪':'黄瓜','丝爪':'丝瓜','苦爪':'苦瓜','西爪':'西瓜','木爪':'木瓜','南爪':'南瓜','悟瓜':'南瓜','西柢':'西瓜',
  '鸡旦':'鸡蛋','吉蛋':'鸡蛋','鸡掸':'鸡蛋','鸡但':'鸡蛋','鸡蛋清':'蛋清','鸭旦':'鸭蛋','皮旦':'皮蛋','咸旦':'咸蛋','鹌鹓蛋':'鹌鹑蛋',
  '豆府':'豆腐','豆付':'豆腐','豆干':'豆腐干','香干':'豆腐干','豆府干':'豆腐干','腐竹丝':'腐竹',
  '辣掓':'辣椒','辣叔':'辣椒','花掓':'花椒','青掓':'青椒','红掓':'红椒','干辣掓':'干辣椒','辣菽':'辣椒','藤掓':'藤椒',
  '波菜':'菠菜','波莱':'菠菜','菠采':'菠菜','菠莱':'菠菜','波采':'菠菜','菠薐':'菠菜','芹菜':'芹菜','芹苔':'芹菜','荠菜':'荠菜',
  '香菰':'香菇','香姑':'香菇','磨菇':'蘑菇','蘑菰':'蘑菇','蘑菇头':'蘑菇','金针菰':'金针菇','香菇姑':'香菇','口磨':'口蘑','草茹':'草菇','香菇柄子':'香菇',
  '木饵':'木耳','银饵':'银耳','白木耳':'银耳','海芾':'海带','海带丝结':'海带结','紫罗':'紫菜','海苔丝':'海苔','冬菰':'冬菇','茶树菰':'茶树菇',
  '大聪':'大葱','小聪':'小葱','洋聪':'洋葱','香聪':'香葱','聪':'葱','葱蒜':'葱','大葱蒜':'大葱',
  '生萎':'生姜','生葁':'生姜','老萎':'老姜','老葁':'老姜','生姜片':'姜片','日姜':'生姜','鲜姜':'生姜',
  '猪内':'猪肉','牛内':'牛肉','羊内':'羊肉','鸡内':'鸡肉','鱼内':'鱼肉','排内':'排骨','鸭内':'鸭肉','五内':'五花肉','亥肉':'五花肉','猪五内':'五花肉','培根片':'培根',
  '大祘':'大蒜','大搢':'大蒜','蒜豪':'蒜薹','蒜苔':'蒜薹','蒜苗青':'蒜苗','韭黄芽':'韭黄','大祘头':'蒜头',
  '洋芋':'土豆','马铃薯':'土豆','地蛋':'土豆','土荳':'土豆','上豆':'土豆','土豆儿':'土豆','土头':'土豆','土豆仔':'土豆',
  '番薯':'红薯','山芋':'红薯','红苕':'红薯','地瓜':'红薯','白薯':'红薯','紅薯':'红薯','紅芋':'红薯',
  '苞谷':'玉米','棒子':'玉米','苞米':'玉米','玉米棒':'玉米','玉黍':'玉米','粘玉米':'玉米',
  '芫荽':'香菜','芫荽菜':'香菜','香荽':'香菜','茴香苗':'香菜','芫茜':'香菜','芢荽':'香菜',
  '芝蔴':'芝麻','芝麻酱':'芝麻酱','白芝蔴':'白芝麻','黑芝蔴':'黑芝麻',
  '番笳':'番茄','范茄':'番茄','蕃茄':'番茄','西红柿子':'西红柿','西紅柿':'西红柿',
  '卜':'萝卜','罗ト':'萝卜','茐':'葱','苣':'莴苣','莴苣':'莴笋','莴荀':'莴笋','莴笋':'莴笋',
  '蛋挞皮':'蛋挞','鸡蛋糕':'蛋糕','蛋糕':'蛋糕','饼千':'饼干','饼乾':'饼干',
  '香肠片':'香肠','火腿肠':'火腿肠','午餐肉':'午餐肉','腊肠':'腊肠','香肠':'香肠',
  '木须肉':'木须肉','鱼香肉丝':'鱼香肉丝','宫保鸡丁':'宫保鸡丁','麻婆豆腐':'麻婆豆腐','回锅肉':'回锅肉','红烧肉':'红烧肉','糖醋排骨':'糖醋排骨','可乐鸡翅':'可乐鸡翅','可乐鸡翅根':'可乐鸡翅',
  '榨菜丝':'榨菜','酸菜':'酸菜','雪里红':'雪里蕻','梅干菜':'梅干菜','腊八蒜':'腊八蒜','糖蒜':'糖蒜',
  '饭店':'服务员','小票':'小票','菜单':'菜单','菜品':'菜品','招牌':'招牌'
};

/* ---------- 单位识别库 ---------- */
var UNITS='枚|颗|粒|个|只|根|条|块|片|瓣|头|把|束|朵|株|捆|串|扎|尾|支|份|盘|碟|碗|杯|锅|盆|盅|匙|勺|撮|段|节|张|件|包|袋|罐|盒|篮|窝|棵|斤|两|克|千克|公斤|毫克|毫升|升|g|G|kg|KG|ml|ML|L';
/* 口语容器类量词：识别到手写/口语模糊单位时，自动替换为该食材的默认单位 */
var UNIT_SOFT = {'勺':1,'匙':1,'碗':1,'杯':1,'盘':1,'碟':1,'份':1,'盅':1,'锅':1,'盆':1,'小勺':1,'大勺':1,'汤匙':1,'茶匙':1,'小碗':1};
/* 食材 → 默认单位（单位缺失或口语量词时自动修正，如“苹果5勺”→“苹果5块”） */
var FOOD_UNIT = {
  '苹果':'块','西瓜':'块','哈密瓜':'块','菠萝':'块','木瓜':'块','牛油果':'个','榴莲':'瓣','柚子':'瓣',
  '香蕉':'根','黄瓜':'根','丝瓜':'根','苦瓜':'根','茄子':'根','西葫芦':'根','山药':'根','莴笋':'根','玉米':'根','胡萝卜':'根','白萝卜':'根','青萝卜':'根','红萝卜':'根','水萝卜':'根','萝卜':'根','大葱':'根','小葱':'根','葱':'根','油条':'根','香肠':'根','火腿':'根','甘蔗':'根',
  '土豆':'个','红薯':'个','芋头':'个','鸡蛋':'个','鸭蛋':'个','皮蛋':'个','咸蛋':'个','松花蛋':'个','西红柿':'个','番茄':'个','辣椒':'个','青椒':'个','红椒':'个','橙子':'个','橘子':'个','梨':'个','桃':'个',
  '姜':'块','生姜':'块','豆腐':'块','豆腐干':'块','豆干':'块','肉':'块','猪肉':'块','五花肉':'块','牛肉':'块','羊肉':'块','鸡肉':'块','鸭肉':'块','鱼':'条','草鱼':'条','鲈鱼':'条','鲫鱼':'条','带鱼':'条','黄鱼':'条',
  '香菇':'朵','蘑菇':'朵','平菇':'朵','木耳':'朵','银耳':'朵','西兰花':'朵','花菜':'朵','菜花':'朵',
  '金针菇':'把','蒜薹':'把','韭菜':'把','菠菜':'把','小白菜':'把','上海青':'把','油麦菜':'把','芹菜':'把','香菜':'把','豆芽':'把','荷兰豆':'把','四季豆':'把','豆角':'把','豌豆':'把','毛豆':'把','茼蒿':'把','空心菜':'把','芥蓝':'把','芦笋':'把','秋葵':'把','小米椒':'把',
  '大蒜':'头','蒜':'头','大白菜':'棵','娃娃菜':'棵','生菜':'棵','卷心菜':'棵','包菜':'棵',
  '鸡蛋':'个','鸭蛋':'个','鹌鹑蛋':'颗','草莓':'颗','蓝莓':'颗','花生':'颗','红枣':'颗','桂圆':'颗','山楂':'颗','腰果':'颗','杏仁':'颗','松子':'颗','板栗':'颗','核桃':'个',
  '虾':'只','虾仁':'只','蟹':'只','鱿鱼':'只','扇贝':'只','生蚝':'只','鸡翅':'根','鸡腿':'个','鸡爪':'根','鸡胸':'块','里脊':'块','排骨':'根','牛腱':'块','豆腐泡':'个','豆泡':'个','面筋':'个',
  '馒头':'个','包子':'个','饺子':'个','汤圆':'个','年糕':'块','蛋糕':'块','面包':'片','培根':'片','紫菜':'片','藕':'节','莲藕':'节','海带':'段',
  '米饭':'碗','面条':'碗','粥':'碗','鱼片':'片','龙利鱼':'片','三文鱼':'块','鱼块':'块','肉片':'片','肉丝':'份'
};

/* ---------- 工具：正则/归一/单位修正 ---------- */
function chineseNumToInt(s){
  var map = {'一':1,'二':2,'两':2,'三':3,'四':4,'五':5,'六':6,'七':7,'八':8,'九':9,'十':10,'半':0.5};
  var n = 0;
  for(var i=0;i<String(s).length;i++){ n = n*10 + (map[s[i]]||0); }
  return n;
}
function toNum(s){ if(/^[0-9]+$/.test(s)) return parseInt(s,10); return chineseNumToInt(s); }
function normChar(c){ return OCR_MAP[c] || c; }
function normalizeWord(w){ return String(w).split('').map(normChar).join(''); }
var CN_RE = /^[\u4e00-\u9fa5]+$/;
/* 名称智能归一：形近字 → 别名 → 词典标准名；用于手写/OCR 与手动输入 */
var normDict = DICT.map(normalizeWord);
function fixName(name){
  if(!name) return name;
  var raw = String(name).trim();
  if(!raw) return raw;
  if(FOOD_ALIAS[raw]) return FOOD_ALIAS[raw];
  var np = normalizeWord(raw);
  if(FOOD_ALIAS[np]) return FOOD_ALIAS[np];
  var idx = normDict.indexOf(np);
  if(idx > -1) return DICT[idx];
  return raw;
}
/* 单位拆分与修正：把口语/缺失单位校正为食材默认单位 */
function splitQty(q){
  if(!q) return {n:'',u:''};
  var m = String(q).match(/^([0-9一二三四五六七八九十两半]+)\s*(.*)$/);
  return {n:m?m[1]:(String(q)||''), u:m?(m[2]||'').trim():''};
}
function fixUnit(name, qtyStr){
  if(!name || !qtyStr) return qtyStr||'';
  var p = splitQty(qtyStr);
  var def = FOOD_UNIT[name];
  if(def){
    if(!p.u) return p.n + def;
    if(UNIT_SOFT[p.u]) return p.n + def;
  }
  return qtyStr;
}

/* ---------- 文本解析（手动输入用） ---------- */
var LINE_RE = new RegExp('^(.+?)\\s*([0-9一二三四五六七八九十两半]+)\\s*('+UNITS+')?$');
function parseIngredients(text){
  var items = [];
  var lines = String(text||'').split(/[\n,，、;；]+/);
  lines.forEach(function(line){
    line = line.trim();
    if(!line) return;
    var m = line.match(LINE_RE);
    if(m){
      var name = fixName(m[1].trim());
      var num = m[2], unit = (m[3]||'').toLowerCase();
      var weight = 0;
      if(unit==='克'||unit==='g'||unit==='G'){ weight = toNum(num); }
      else if(unit==='斤'){ weight = toNum(num)*500; }
      else if(unit==='千克'||unit==='公斤'||unit==='kg'||unit==='KG'){ weight = toNum(num)*1000; }
      var qty = fixUnit(name, num+(m[3]||''));
      items.push({name:name, qty:qty, weight:weight});
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

/* ---------- OCR 文本 → 食材清单（词典最大匹配 + 别名 + 单位修正） ---------- */
var NUM_TAIL_RE = new RegExp('^([0-9]+|[一二三四五六七八九十两半]+)('+UNITS+')?');

function extractFromText(text){
  var t = String(text||'');
  var found = {};
  var maxL = 6;
  var compact = normalizeWord(t.replace(/[\s\u3000、，,。；;·•\-—_*:：()（）【】[\]"'"“”]+/g,''));
  var i = 0, lastName = null, lastNameEnd = -1, pendingQty = null;
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
    if(qty) qty = fixUnit(name, qty);
    if(found[name]){ if(qty) found[name].qty = qty; }
    else { found[name] = {name:name, qty:qty||'', weight:0}; }
    lastName = name;
  }
  while(i < compact.length){
    var ch = compact.charAt(i);
    // ① 数字 → 数量
    if(/[0-9一二三四五六七八九十两半]/.test(ch)){
      var dm = compact.substr(i).match(NUM_TAIL_RE);
      if(dm){
        var q = dm[0];
        if(dm[2]){
          // 完整"数字+单位" → 数量（归属前一食材；无则暂存给下个食材）
          if(lastName){ commit(lastName, q); }
          else { pendingQty = q; }
          i += q.length;
          continue;
        } else if(/^[0-9]+$/.test(dm[1])){
          // 纯阿拉伯数字：如紧邻上一食材（"苹果3"）→ 直接归属并补默认单位；否则暂存给下个食材
          if(lastName && i === lastNameEnd){ commit(lastName, dm[1]); }
          else { pendingQty = dm[1]; }
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
      lastNameEnd = i + matchedLen;
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
/* 历史记录：下拉菜单 + 左滑删除。
   顶部折叠条 = 下拉菜单入口；条目点击标题/「查看」恢复并跳转展示页；
   点 ▾ 展开该条食材明细；向左滑动条目露出红色「删除」可删除该条记录。 */
function openHistory(h){
  if(!h) return;
  var base = (h.items && h.items.length) ? h.items : (h.names||[]).map(function(n){ return {name:n}; });
  var items = base.map(function(it){ return {name:it.name, qty:it.qty||'', weight:it.weight||0, done:false}; });
  setActive(items);
  setMeta({name: h.name || autoName(items), cat: h.cat || ''});
  location.href='show.html';
}
function renderHistory(histEl, emptyMsg){
  if(!histEl) return;
  var arr = getHistory();
  histEl.innerHTML='';
  if(!arr.length){ histEl.innerHTML='<p class="hint">'+(emptyMsg||'暂无历史记录')+'</p>'; return; }

  /* 顶部下拉菜单条 */
  var bar=document.createElement('button'); bar.type='button'; bar.className='hist-bar';
  bar.innerHTML='<span class="hb-txt">历史记录 · 共 '+arr.length+' 条</span><span class="ht-chev">▾</span>';
  var body=document.createElement('div'); body.className='hist-body';
  bar.addEventListener('click', function(){
    var collapsed = body.style.display==='none';
    body.style.display = collapsed ? 'block' : 'none';
    bar.classList.toggle('collapsed', !collapsed);
    bar.querySelector('.ht-chev').textContent = '▾';
  });
  histEl.appendChild(bar); histEl.appendChild(body);

  var MAXW = 76;
  arr.forEach(function(h, idx){
    var items=(h.items&&h.items.length)?h.items:(h.names||[]).map(function(n){return {name:n};});
    var sw=document.createElement('div'); sw.className='h-swipe';
    var delBtn=document.createElement('button'); delBtn.type='button'; delBtn.className='h-del'; delBtn.textContent='删除';
    var main=document.createElement('div'); main.className='h-main';
    var head=document.createElement('div'); head.className='h-head';
    var chev=document.createElement('span'); chev.className='h-chev'; chev.textContent='▾';
    var t=document.createElement('span'); t.className='h-time'; t.textContent=h.name || autoName(items);
    t.title = h.time;
    var catTag=document.createElement('span'); catTag.className='h-cat-tag'; catTag.textContent=h.cat||'';
    if(!h.cat) catTag.style.display='none';
    var cnt=document.createElement('span'); cnt.className='h-cnt'; cnt.textContent=items.length+' 种';
    var bt=document.createElement('button'); bt.type='button'; bt.className='h-btn'; bt.textContent='查看';
    head.appendChild(chev); head.appendChild(t); head.appendChild(catTag); head.appendChild(cnt); head.appendChild(bt);
    var det=document.createElement('div'); det.className='h-detail';
    var wrap=document.createElement('div'); wrap.className='h-detail-in';
    items.forEach(function(it){
      var c=document.createElement('span'); c.className='chip h-chip'; c.textContent=it.name+(it.qty?(' '+it.qty):'');
      c.addEventListener('click', function(e){ e.stopPropagation(); openHistory(h); });
      wrap.appendChild(c);
    });
    det.appendChild(wrap);
    main.appendChild(head); main.appendChild(det);
    sw.appendChild(delBtn); sw.appendChild(main);
    body.appendChild(sw);

    chev.addEventListener('click', function(e){ e.stopPropagation(); det.classList.toggle('open'); });
    bt.addEventListener('click', function(e){ e.stopPropagation(); openHistory(h); });
    head.addEventListener('click', function(e){
      if(e.target===bt || e.target===chev) return;
      openHistory(h);
    });

    /* 左滑手势：滑出删除按钮 */
    var startX=0, startY=0, dx=0, moved=false, open=false, suppressClick=false;
    sw.addEventListener('touchstart', function(e){
      var t=e.touches[0]; startX=t.clientX; startY=t.clientY; dx=0; moved=false; suppressClick=false;
      main.style.transition='none';
    }, {passive:true});
    sw.addEventListener('touchmove', function(e){
      var t=e.touches[0];
      dx=t.clientX-startX; var dy=t.clientY-startY;
      if(Math.abs(dx)>8 && Math.abs(dx)>Math.abs(dy)){
        moved=true; suppressClick=true;
      }
      if(moved){
        e.preventDefault();
        var x = Math.max(-MAXW, Math.min(0, (open?-MAXW:0) + dx));
        main.style.transform = 'translateX('+x+'px)';
        sw.classList.toggle('sliding', moved);
      }
    }, {passive:false});
    sw.addEventListener('touchend', function(){
      main.style.transition='transform .25s ease';
      if(moved){
        open = dx < -30;
        main.style.transform = open ? 'translateX(-'+MAXW+'px)' : 'translateX(0px)';
        sw.classList.toggle('open', open);
        sw.classList.remove('sliding');
        moved=false;
      }
    });
    /* 滑动后抑制触发跳转的 click（点击删除按钮除外） */
    sw.addEventListener('click', function(e){
      if(suppressClick && !delBtn.contains(e.target)){ e.preventDefault(); e.stopPropagation(); }
      suppressClick=false;
    }, true);

    delBtn.addEventListener('click', function(){
      var a = getHistory();
      if(a[idx]){
        a.splice(idx,1); setJSON(keys.history, a);
        renderHistory(histEl, emptyMsg);
        var st = document.getElementById('status');
        if(st){ st.className='status done'; st.textContent='已删除该条历史记录'; }
      }
    });
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
  var pvEl = document.getElementById('pvList');

  var candidates = getCandidates();
  var items = [];   // 编辑中的清单 [{name,qty,weight}]

  /* 名称自动补全下拉（datalist，取自识别库） */
  if(!document.getElementById('foodList')){
    var dl=document.createElement('datalist'); dl.id='foodList';
    var seen={};
    DICT.concat(Object.keys(FOOD_ALIAS)).forEach(function(n){
      if(!seen[n]){ seen[n]=1; var o=document.createElement('option'); o.value=n; dl.appendChild(o); }
    });
    document.body.appendChild(dl);
  }

  function parseToItems(){
    // 手动输入文本 + 识别候选 合并
    var fromText = parseIngredients(ta.value);
    var map = {};
    fromText.concat(candidates).forEach(function(it){ if(!map[it.name]) map[it.name]=it; });
    items = Object.keys(map).map(function(k){ return map[k]; });
    refreshList();
    var lm=listNameEl();
    if(lm && !lm.value.trim() && items.length) lm.value = autoName(items);
  }
  function refreshList(){
    listWrap.innerHTML='';
    if(!items.length){
      listWrap.innerHTML='<p class="hint" style="text-align:center;padding:18px 0;">暂无食材<br>点击下方「＋ 新增食材」或上方「引入识别结果」</p>';
    }
    items.forEach(function(it, idx){
      var row=document.createElement('div'); row.className='edit-item';
      var nm=document.createElement('input'); nm.type='text'; nm.className='e-name-inp';
      nm.value=it.name||''; nm.placeholder='食材名称（可编辑）'; nm.setAttribute('list','foodList');
      nm.addEventListener('input', function(){ it.name = nm.value; });
      nm.addEventListener('blur', function(){
        var fixed = fixName(it.name);
        if(fixed && fixed !== it.name){ it.name = fixed; nm.value = fixed; setStatus(statusEl, '已识别名称：'+fixed, 'done'); }
      });
      var qWrap=document.createElement('div'); qWrap.className='e-qty';
      var inp=document.createElement('input'); inp.type='text'; inp.className='qty-input'; inp.value=it.qty||''; inp.placeholder='数量+单位';
      inp.addEventListener('input', function(){ it.qty = inp.value; });
      inp.addEventListener('blur', function(){
        if(it.name && inp.value){ it.qty = fixUnit(it.name, inp.value); inp.value = it.qty; }
      });
      qWrap.appendChild(inp);
      var del=document.createElement('button'); del.className='e-del'; del.textContent='×';
      del.onclick=function(){ items.splice(idx,1); refreshList(); };
      row.appendChild(nm); row.appendChild(qWrap); row.appendChild(del);
      listWrap.appendChild(row);
    });
    if(countEl) countEl.textContent = items.length;
    if(genBtn) genBtn.disabled = !items.length;
    renderPreview();
  }
  /* 产物视图：只读展示生成的清单（默认视图） */
  function renderPreview(){
    if(!pvEl) return;
    pvEl.innerHTML='';
    var valid = items.filter(function(it){ return it.name; });
    var lm = listNameEl();
    var nmEl=document.getElementById('pvName');
    var catEl=document.getElementById('pvCat');
    var cntEl=document.getElementById('pvCount');
    var g2=document.getElementById('generateBtn2');
    if(nmEl) nmEl.textContent = (lm && lm.value.trim()) ? lm.value.trim() : autoName(items);
    if(catEl){ if(catSel){ catEl.style.display=''; catEl.textContent=catSel; } else catEl.style.display='none'; }
    if(cntEl) cntEl.textContent=valid.length+' 种';
    if(g2) g2.disabled=!valid.length;
    valid.forEach(function(it){
      var row=document.createElement('div'); row.className='pv-item';
      var n=document.createElement('span'); n.className='pv-i-name'; n.textContent=it.name;
      var q=document.createElement('span'); q.className='pv-i-qty'; q.textContent=it.qty||'';
      row.appendChild(n); row.appendChild(q); pvEl.appendChild(row);
    });
    if(!valid.length) pvEl.innerHTML='<p class="hint" style="text-align:center;padding:18px 0;">暂无食材</p>';
  }
  /* 视图切换：默认产物视图；编辑视图仅在点「✏️ 编辑」后显示 */
  function showPreview(){
    var pv=document.getElementById('previewView'), ev=document.getElementById('editView');
    if(pv) pv.style.display='block';
    if(ev) ev.style.display='none';
    renderPreview();
    if(statusEl) statusEl.textContent='';
  }
  function showEdit(){
    var pv=document.getElementById('previewView'), ev=document.getElementById('editView');
    if(pv) pv.style.display='none';
    if(ev) ev.style.display='block';
    if(statusEl) statusEl.textContent='';
  }
  function toText(){
    return items.map(function(it){ return it.name + (it.qty?(' '+it.qty):''); }).join('、');
  }

  /* 「＋ 新增食材」按钮：自动挂在清单卡底部 */
  var addBtn=document.createElement('button'); addBtn.className='add-row-btn'; addBtn.type='button';
  addBtn.textContent='＋ 新增食材（自动识别名称）';
  addBtn.addEventListener('click', function(){
    items.push({name:'', qty:'', weight:0});
    refreshList();
    var inps = listWrap.querySelectorAll('.e-name-inp');
    if(inps.length){ var last=inps[inps.length-1]; last.focus(); last.value=''; }
    if(statusEl) statusEl.textContent='';
  });
  if(listWrap && listWrap.parentNode){ listWrap.parentNode.insertBefore(addBtn, listWrap.nextSibling); }

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
      setStatus(statusEl,'已引入识别结果 '+c.length+' 种食材','done');
    });
  }
  var clearBtn = document.getElementById('clearBtn');
  if(clearBtn) clearBtn.addEventListener('click', function(){
    ta.value=''; items=[]; refreshList(); setStatus(statusEl,'已清空','');
  });

  /* 清单分类：chips 单选 + 新建分类（写入本地分类库） */
  var catSel = '';
  function renderCats(){
    var bar = document.getElementById('catBar');
    if(!bar) return;
    bar.innerHTML='';
    getCats().forEach(function(c){
      var b=document.createElement('button'); b.type='button';
      b.className='cat-chip'+(c===catSel?' on':'');
      b.textContent=c;
      b.addEventListener('click', function(){ catSel=(catSel===c)?'':c; renderCats(); });
      bar.appendChild(b);
    });
  }
  renderCats();
  var addCatBtn=document.getElementById('addCatBtn');
  if(addCatBtn) addCatBtn.addEventListener('click', function(){
    var n=prompt('输入新分类名称（如：卤味、腌菜、快手菜）','');
    if(n){ var r=addCat(n); if(r){ catSel=r; renderCats(); setStatus(statusEl,'已新增分类：'+r,'done'); } }
  });
  function listNameEl(){ return document.getElementById('listName'); }

  function gen(){
    if(!items.length){ setStatus(statusEl,'请先添加食材','err'); return; }
    var finalItems = items.filter(function(it){ return it.name; }).map(function(it){ return {name:it.name, qty:it.qty, weight:it.weight||0, done:false}; });
    if(!finalItems.length){ setStatus(statusEl,'请先添加食材','err'); return; }
    var lm=listNameEl();
    var listName = (lm && lm.value.trim()) ? lm.value.trim() : autoName(finalItems);
    setActive(finalItems);
    setMeta({name:listName, cat:catSel});
    addHistory(finalItems, listName, catSel);
    setCandidates([]); // 清除候选，避免下次重复
    location.href='show.html';
  }
  if(genBtn) genBtn.addEventListener('click', gen);
  var genBtn2=document.getElementById('generateBtn2');
  if(genBtn2) genBtn2.addEventListener('click', gen);
  var editBtn=document.getElementById('editBtn');
  if(editBtn) editBtn.addEventListener('click', showEdit);
  var doneBtn=document.getElementById('doneEditBtn');
  if(doneBtn) doneBtn.addEventListener('click', showPreview);

  // 初始化：预填候选
  if(candidates.length){
    ta.value = candidates.map(function(it){ return it.name+(it.qty?(' '+it.qty):''); }).join('、');
    items = candidates.map(function(it){ return {name:it.name, qty:it.qty, weight:it.weight||0}; });
    refreshList();
    var lm=listNameEl();
    if(lm && !lm.value.trim()) lm.value = autoName(items);
    setStatus(statusEl,'已按识别结果自动命名（可修改），核对后生成','done');
  } else {
    refreshList();
  }
  setTab('edit');
  /* 默认展示产物视图；无产物时进入编辑视图 */
  if(items.length){ showPreview(); } else { showEdit(); }
}

/* ==================================================================
   页面 ③  展示页（show.html）
   ================================================================== */
function initShow(){
  var statusEl = document.getElementById('status');
  var listEl = document.getElementById('list');
  var islandText = document.getElementById('islandText');
  var islandCount = document.getElementById('islandCount');
  var metaEl = document.getElementById('meta');
  var resetBtn = document.getElementById('resetBtn');
  var finishOv = document.getElementById('finishOv');

  var currentItems = getActive();
  var doneCount = 0;

  function updateIsland(){
    var total = currentItems.length;
    islandCount.textContent = doneCount + '/' + total;
    if(!total){ islandText.textContent='准备食材';
      islandCount.style.color=''; islandCount.style.background='';
    } else if(doneCount>=total){
      islandText.textContent='全部准备好了！';
      islandCount.style.color='#1F5C46'; islandCount.style.background='#7ED6B8';
    } else {
      islandText.textContent = (doneCount ? '已备好 '+doneCount+' 种' : '准备食材');
      islandCount.style.color=''; islandCount.style.background='';
    }
    if(finishOv){ finishOv.hidden = !(total && doneCount>=total); }
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
      if(row.classList.contains('done')) return;
      row.classList.add('done','pop');
      currentItems[idx].done=true; doneCount++; save(); updateIsland();
      setTimeout(function(){ if(row.parentNode){ row.parentNode.removeChild(row); } }, 560);
    });
    listEl.appendChild(row);
  }
  function save(){ setActive(currentItems); }
  function build(){
    var infoEl=document.getElementById('showInfo');
    if(infoEl){
      var m=getMeta();
      var nm=(m && m.name)?String(m.name):'';
      var ct=(m && m.cat)?String(m.cat):'';
      if(!nm && !ct){ infoEl.style.display='none'; }
      else {
        infoEl.style.display='flex';
        infoEl.innerHTML='';
        if(nm){ var s=document.createElement('span'); s.className='si-name'; s.textContent=nm; infoEl.appendChild(s); }
        if(ct){ var c=document.createElement('span'); c.className='si-cat'; c.textContent=ct; infoEl.appendChild(c); }
      }
    }
    listEl.innerHTML='';
    doneCount = currentItems.filter(function(it){ return !!it.done; }).length;
    if(!currentItems.length){
      var empty=document.createElement('div'); empty.className='list-empty';
      empty.innerHTML='🧾<br>还没有内容<br>请先到「生成页」生成清单，或从首页历史打开一份';
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
      if(finishOv) finishOv.hidden = true;
      setStatus(statusEl,'已重置进度','done');
    });
  }
  var fr=document.getElementById('finishReset');
  if(fr){ fr.addEventListener('click', function(){ if(resetBtn) resetBtn.click(); }); }
  var fh=document.getElementById('finishHome');
  if(fh){ fh.addEventListener('click', function(){ location.href='index.html'; }); }
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
  extractFromText:extractFromText, parseIngredients:parseIngredients,
  fixName:fixName, fixUnit:fixUnit, openHistory:openHistory
};

/* OCR 引擎备用源 */
if(window.Tesseract === undefined){
  var s=document.createElement('script');
  s.src='https://cdn.jsdelivr.net/npm/tesseract.js@5/dist/tesseract.min.js';
  document.head.appendChild(s);
}

})();
