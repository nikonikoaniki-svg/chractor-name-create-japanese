(()=>{
const DB=window.CHARA_NAME_DB;
const R=DB.records;
const surnames=R.filter(x=>x.type==='surname_pool');
const givens=R.filter(x=>x.type==='completed_given');

const state={
  gender:'any', moods:[], motif:'none',
  surname:null, given:null,
  surnameHistory:[], givenHistory:[],
  recentSurnames:[], recentGivens:[], recentChars:[]
};
const $=s=>document.querySelector(s);
$('#dbCount').textContent=DB.stats.total.toLocaleString('ja-JP');

function strictGender(x){
  if(state.gender==='any') return true;
  return x.gender===state.gender;
}

function score(x){
  let s=1;
  const tags=x.tags||[], motifs=x.motifs||[];
  for(const m of state.moods) if(tags.includes(m)) s+=7;
  if(state.motif!=='none' && motifs.includes(state.motif)) s+=10;

  // 同じ漢字ばかり続くのを抑える
  const chars=[...x.text];
  for(const c of chars){
    const count=state.recentChars.filter(x=>x===c).length;
    if(count) s*=Math.pow(.58,count);
  }
  return Math.max(.05,s);
}

function weightedPick(pool,recent){
  let p=pool.filter(x=>!recent.includes(x.text));
  if(!p.length) p=pool;
  const scored=p.map(x=>[x,score(x)]);
  let total=scored.reduce((a,b)=>a+b[1],0);
  let r=Math.random()*total;
  for(const [x,w] of scored){
    r-=w;
    if(r<=0) return x;
  }
  return scored.at(-1)[0];
}

function rememberChars(text){
  for(const c of [...text]) state.recentChars.push(c);
  while(state.recentChars.length>60) state.recentChars.shift();
}
function pushRecent(arr,text){
  arr.push(text);
  while(arr.length>100) arr.shift();
}
function givenPool(){ return givens.filter(strictGender); }

function spinSurname(){
  const n=weightedPick(surnames,state.recentSurnames);
  if(state.surname) state.surnameHistory.push(state.surname);
  state.surname=n;
  pushRecent(state.recentSurnames,n.text);
  rememberChars(n.text);
  render();
}
function spinGiven(){
  const pool=givenPool();
  if(!pool.length) return;
  const n=weightedPick(pool,state.recentGivens);
  if(state.given) state.givenHistory.push(state.given);
  state.given=n;
  pushRecent(state.recentGivens,n.text);
  rememberChars(n.text);
  render();
}
function backSurname(){
  if(!state.surnameHistory.length) return;
  state.surname=state.surnameHistory.pop();
  render();
}
function backGiven(){
  if(!state.givenHistory.length) return;
  state.given=state.givenHistory.pop();
  render();
}

function render(){
  if(!state.surname||!state.given) return;
  $('#surnameText').textContent=state.surname.text;
  $('#givenText').textContent=state.given.text;
  $('#fullName').textContent=state.surname.text+' '+state.given.text;
  $('#surnameBack').disabled=!state.surnameHistory.length;
  $('#givenBack').disabled=!state.givenHistory.length;
  updateSaveButton();
}

document.querySelectorAll('.chips.single .chip').forEach(btn=>btn.onclick=()=>{
  const w=btn.parentElement;
  w.querySelectorAll('.chip').forEach(b=>b.classList.remove('active'));
  btn.classList.add('active');

  if(w.dataset.group==='gender'){
    state.gender=btn.dataset.value;
    state.givenHistory=[];
    state.recentGivens=[];
    spinGiven();
  }
  if(w.dataset.group==='motif'){
    state.motif=btn.dataset.value;
  }
});

document.querySelectorAll('.chips.multi .chip').forEach(btn=>btn.onclick=()=>{
  btn.classList.toggle('active');
  state.moods=[...btn.parentElement.querySelectorAll('.chip.active')].map(b=>b.dataset.value);
});

$('#generateAll').onclick=()=>{spinSurname();spinGiven()};
$('#surnameSpin').onclick=spinSurname;
$('#givenSpin').onclick=spinGiven;
$('#surnameBack').onclick=backSurname;
$('#givenBack').onclick=backGiven;

// 保存は漢字のみ
let memFav=[];
function loadFav(){
  try{
    const x=JSON.parse(localStorage.getItem('charaNameKoboFavoritesKanji')||'[]');
    if(Array.isArray(x)) return x;
  }catch(e){}
  try{
    const x=JSON.parse(sessionStorage.getItem('charaNameKoboFavoritesKanji')||'[]');
    if(Array.isArray(x)) return x;
  }catch(e){}
  return memFav;
}
function saveFav(arr){
  memFav=[...arr];
  try{localStorage.setItem('charaNameKoboFavoritesKanji',JSON.stringify(arr))}catch(e){}
  try{sessionStorage.setItem('charaNameKoboFavoritesKanji',JSON.stringify(arr))}catch(e){}
  renderFav();
}
function currentKey(){
  return state.surname.text+' '+state.given.text;
}
function updateSaveButton(){
  const exists=loadFav().some(x=>x.name===currentKey());
  $('#saveFavorite').textContent=exists?'♥ 保存済み':'♡ 保存';
  $('#saveFavorite').classList.toggle('saved',exists);
}
$('#saveFavorite').onclick=()=>{
  const arr=[...loadFav()];
  const name=currentKey();
  if(!arr.some(x=>x.name===name)) arr.unshift({name});
  saveFav(arr.slice(0,200));
  $('#favoritesBox').open=true;
  updateSaveButton();
};
$('#clearFavorites').onclick=e=>{
  e.preventDefault();
  saveFav([]);
  updateSaveButton();
};
function renderFav(){
  const arr=loadFav();
  $('#favCount').textContent=arr.length;
  const box=$('#favoriteList');
  box.innerHTML='';
  if(!arr.length){
    box.innerHTML='<div class="empty">まだ保存されていません。</div>';
    return;
  }
  arr.forEach((x,i)=>{
    const d=document.createElement('div');
    d.className='fav';
    d.innerHTML=`<div><b>${x.name}</b></div><button title="削除">×</button>`;
    d.querySelector('button').onclick=()=>{
      const a=loadFav();
      a.splice(i,1);
      saveFav(a);
      updateSaveButton();
    };
    box.appendChild(d);
  });
}

$('#stats').textContent=
  `全${DB.stats.total.toLocaleString()}項目／姓${DB.stats.surname_pool.toLocaleString()}／完成名${DB.stats.completed_given.toLocaleString()}／創作部品・字面パターン・ルール${DB.stats.creative_total.toLocaleString()}。辞書は漢字＋タグのみで、読み情報は保持しません。`;

state.surname=surnames[0];
state.given=givens.find(x=>x.gender==='neutral')||givens[0];
render();
renderFav();
})();