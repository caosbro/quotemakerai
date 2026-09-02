const CONFIG={
  pin:"2460",
  minCharge:0,
  multiplier:1.5,
  waste:{
    mixed:{label:"Mixed Waste",unit:"tonne",price:170},
    wood:{label:"Wood",unit:"tonne",price:110},
    soil:{label:"Soil",unit:"tonne",price:80},
    rubble:{label:"Rubble",unit:"tonne",price:80},
    mattresses:{label:"Mattresses",unit:"each",price:50},
    fridges:{label:"Fridges",unit:"each",price:50}
  },
  common:{
    "2 Seater Sofa":.08,"3 Seater Sofa":.11,"Washing Machine":.07,"Tumble Dryer":.06,
    "Fridge Freezer":.10,"Single Mattress":.025,"Double Mattress":.035,"Wardrobe":.08,
    "Chest of Drawers":.05,"Black Bags":.02,"Carpet":.05,"Garden Waste":.08,"Builders Waste":.10
  },
  weights:{
    "2 Seater Sofa":"0.08 t","3 Seater Sofa":"0.11 t","Washing Machine":"0.07 t","Tumble Dryer":"0.06 t",
    "Fridge Freezer":"0.10 t","Single Mattress":"0.025 t","Double Mattress":"0.035 t","Wardrobe":"0.08 t",
    "Chest of Drawers":"0.05 t","Black Bags":"0.02 t each","Carpet":"0.05 t","Garden Waste":"0.08 t","Builders Waste":"0.10 t"
  }
};
const DEFAULT_DISPOSAL_COSTS=Object.fromEntries(Object.entries(CONFIG.waste).map(([k,v])=>[k,v.price]));
const DEFAULT_BUSINESS={name:"Evans Property Clearance",phone:"07954130766",email:"evanspropertyclearance@gmail.com"};
function getBusiness(){try{return {...DEFAULT_BUSINESS,...JSON.parse(localStorage.getItem("epc_business")||"{}")}}catch{return {...DEFAULT_BUSINESS}}}
function loadBusinessSettings(){const b=getBusiness();if($("businessNameSetting"))$("businessNameSetting").value=b.name;if($("businessPhoneSetting"))$("businessPhoneSetting").value=b.phone;if($("businessEmailSetting"))$("businessEmailSetting").value=b.email}
function saveBusinessSettings(){const name=$("businessNameSetting").value.trim(),phone=$("businessPhoneSetting").value.trim(),email=$("businessEmailSetting").value.trim();if(!name||!phone||!email){toast("Complete all business details");return}localStorage.setItem("epc_business",JSON.stringify({name,phone,email}));toast("Business details saved ✓");renderDashboard()}

function loadOwnerPin(){
  try{
    const saved=localStorage.getItem("epc_owner_pin");
    if(saved && /^\d{4,8}$/.test(saved)) CONFIG.pin=saved;
  }catch{}
}
function changeOwnerPin(){
  const next=$("newOwnerPin").value.trim();
  const confirm=$("confirmOwnerPin").value.trim();
  if(!/^\d{4,8}$/.test(next)){toast("Passcode must be 4 to 8 numbers");return}
  if(next!==confirm){toast("Passcodes do not match");return}
  if(next===CONFIG.pin){toast("Enter a different passcode");return}
  CONFIG.pin=next;
  localStorage.setItem("epc_owner_pin",next);
  $("newOwnerPin").value="";$("confirmOwnerPin").value="";
  toast("Owner passcode changed ✓");
}
loadOwnerPin();
function loadDisposalCosts(){
  try{
    const saved=JSON.parse(localStorage.getItem("epc_disposal_costs")||"null");
    if(saved&&typeof saved==="object"){
      Object.keys(CONFIG.waste).forEach(k=>{const n=Number(saved[k]);if(Number.isFinite(n)&&n>=0)CONFIG.waste[k].price=n;});
    }
  }catch{}
}
function renderDisposalCostSettings(){
  const el=$("disposalCostSettings");
  if(!el)return;
  el.innerHTML=Object.entries(CONFIG.waste).map(([key,w])=>`<label class="cost-setting-row"><span>${w.label} <small>(${w.unit})</small></span><input data-disposal-cost="${key}" type="number" min="0" step="0.01" inputmode="decimal" value="${w.price}"></label>`).join("");
}
function saveDisposalCosts(){
  const saved={};
  document.querySelectorAll("[data-disposal-cost]").forEach(input=>{
    const key=input.dataset.disposalCost;
    const n=Number(input.value);
    if(!Number.isFinite(n)||n<0){toast(`Enter a valid cost for ${CONFIG.waste[key].label}`);return;}
    saved[key]=Math.round(n*100)/100;
  });
  if(Object.keys(saved).length!==Object.keys(CONFIG.waste).length)return;
  const previous=Object.fromEntries(Object.entries(CONFIG.waste).map(([k,v])=>[k,v.price]));
  Object.entries(saved).forEach(([k,v])=>CONFIG.waste[k].price=v);
  localStorage.setItem("epc_disposal_costs",JSON.stringify(saved));
  const history=(()=>{try{return JSON.parse(localStorage.getItem("epc_disposal_history")||"[]")}catch{return[]}})();
  history.unshift({date:todayISO(),costs:{...saved},previous});
  localStorage.setItem("epc_disposal_history",JSON.stringify(history.slice(0,30)));
  buildWaste();
  recalc();
  renderDisposalHistory();
  toast("Disposal costs saved ✓");
}
loadDisposalCosts();
let state=loadState();
const $=sel=> sel.startsWith("#")?document.querySelector(sel): (sel.includes("[")||sel.includes(".")||sel.includes(" "))?document.querySelector(sel):document.getElementById(sel);
const money=n=>new Intl.NumberFormat("en-GB",{style:"currency",currency:"GBP"}).format(Number(n)||0);
const todayISO=()=>new Date().toISOString();
function loadState(){return JSON.parse(localStorage.getItem("epc_quotes")||"[]")}
function saveState(){localStorage.setItem("epc_quotes",JSON.stringify(state))}
function nextDocumentNumber(type="Quote"){
  const prefix=type==="Invoice"?"EPC-I":"EPC-Q";
  const max=state.reduce((m,q)=>{
    const n=String(q.number||"");
    if((type==="Invoice" && n.startsWith("EPC-I-")) || (type!=="Invoice" && (n.startsWith("EPC-Q-") || (!n.startsWith("EPC-I-") && n.startsWith("EPC-"))))){
      return Math.max(m,parseInt(n.split("-").pop())||0);
    }
    return m;
  },0)+1;
  return `${prefix}-${new Date().getFullYear()}-${String(max).padStart(5,"0")}`;
}
function nextQuote(){return nextDocumentNumber("Quote")}
function getDocumentType(){return document.querySelector("[data-document-type].selected")?.dataset.documentType||"Quote"}
function updateDocumentType(){
  const type=getDocumentType();
  const label=type==="Invoice"?"Invoice · payment record / amount due":"Quote · customer price proposal";
  if($("documentTypeStatus")) $("documentTypeStatus").textContent=label;
  if($("quoteNumber")) $("quoteNumber").value=nextDocumentNumber(type);
  if($("pdfBtn")) $("pdfBtn").textContent=type==="Invoice"?"MAKE PDF INVOICE":"MAKE PDF QUOTE";
  if($("customerPdfBtn")) $("customerPdfBtn").textContent=type==="Invoice"?"MAKE PDF INVOICE":"MAKE PDF QUOTE";
}
function toast(t){const e=$("toast");e.textContent=t;e.classList.add("show");setTimeout(()=>e.classList.remove("show"),1800)}
function buildWaste(){
  $("wasteRows").innerHTML=Object.entries(CONFIG.waste).map(([key,w])=>{
    const step=w.unit==="each"?1:.1;
    const val=state.draft?.waste?.[key]||0;
    return `<div class="waste-row" data-key="${key}">
      <div><div class="waste-title">${w.label}</div><div class="waste-sub">${money(w.price)} / ${w.unit}</div></div>
      <div class="qty"><button data-act="minus">−</button><input data-qty type="number" min="0" step="${step}" value="${val}" inputmode="decimal"><button data-act="plus">+</button></div>
    </div>`}).join("");
}
function buildCommon(){
  $("commonItems").innerHTML=Object.entries(CONFIG.common).map(([name,w])=>`<button data-common="${name}">${name}<span>est. ${CONFIG.weights[name]}</span></button>`).join("");
}
function buildExtras(){
  const extras=[["Difficult access",20],["Upstairs flats",50],["Heavy lifting",50]];
  $("extras").innerHTML=extras.map(([n,v])=>`<button data-extra="${n}" data-value="${v}">${n}<span>+${money(v)}</span></button>`).join("");
}
function init(){
  buildWaste();buildCommon();buildExtras();renderDisposalCostSettings();
  $("quoteNumber").value=nextQuote();
  $("customerName").value="";$("customerPhone").value="";$("customerAddress").value="";$("jobNotes").value="";
  if(!state.draft)state.draft={waste:{},extras:{},customLabour:0,priceMode:"standard",customPrice:0,paymentMethod:"Cash",paymentStatus:"Outstanding",documentType:"Quote"};
  bind();
  recalc();
}
function bindCore(){
  $("wasteRows").onclick=e=>{const row=e.target.closest(".waste-row");if(!row)return;const key=row.dataset.key;const input=row.querySelector("[data-qty]");const step=Number(input.step);let v=Number(input.value)||0;if(e.target.dataset.act==="plus")v+=step;if(e.target.dataset.act==="minus")v=Math.max(0,v-step);input.value=cleanNum(v);recalc()};
  $("wasteRows").oninput=()=>recalc();
  $("commonItems").onclick=e=>{const b=e.target.closest("[data-common]");if(!b)return;const name=b.dataset.common;const kg=CONFIG.common[name];let target="mixed";if(name.includes("Mattress"))target="mattresses";if(name==="Fridge Freezer")target="fridges";if(target==="mixed"){$(`[data-key="${target}"] [data-qty]`).value=cleanNum((Number($(`[data-key="${target}"] [data-qty]`).value)||0)+kg)}else{$(`[data-key="${target}"] [data-qty]`).value=cleanNum((Number($(`[data-key="${target}"] [data-qty]`).value)||0)+1)}recalc();toast(`${name} added`)};
  $("extras").onclick=e=>{const b=e.target.closest("[data-extra]");if(!b)return;b.classList.toggle("active");recalc()};
  document.querySelectorAll(".price-options button").forEach(b=>b.onclick=()=>{document.querySelectorAll(".price-options button").forEach(x=>x.classList.remove("selected"));b.classList.add("selected");$("customPriceWrap").classList.toggle("hidden",b.dataset.price!=="custom");recalc()});
  document.querySelectorAll("[data-document-type]").forEach(b=>b.onclick=()=>{document.querySelectorAll("[data-document-type]").forEach(x=>x.classList.remove("selected"));b.classList.add("selected");updateDocumentType();recalc()});
  document.querySelectorAll("[data-payment-method]").forEach(b=>b.onclick=()=>{document.querySelectorAll("[data-payment-method]").forEach(x=>x.classList.remove("selected"));b.classList.add("selected");updatePaymentSummary()});
  document.querySelectorAll("[data-payment-status]").forEach(b=>b.onclick=()=>{document.querySelectorAll("[data-payment-status]").forEach(x=>x.classList.remove("selected"));b.classList.add("selected");updatePaymentSummary()});
  ["customerName","customerPhone","customerAddress","jobNotes","customLabour","customPrice"].forEach(id=>$(id).addEventListener("input",recalc));
  $("calculateBtn").onclick=()=>{recalc();toast("Quote calculated")};
  $("clearBtn").onclick=clearQuote;
  $("saveBtn").onclick=saveQuote;
  $("saveDisposalCostsBtn").onclick=saveDisposalCosts;
  $("changeOwnerPinBtn").onclick=changeOwnerPin;
  $("whatsappBtn").onclick=sendWhatsApp;
  $("pdfBtn").onclick=makePdfQuote;
  $("customerPdfBtn").onclick=makePdfQuote;
  $("aiPictureBtn").onclick=openAiPicture;
  $("closeKey").onclick=closeGeminiKeySetup;
  $("saveKeyBtn").onclick=saveGeminiKey;
  $("clearKeyBtn").onclick=clearGeminiKey;
  $("closeAi").onclick=closeAiPicture;
  $("closeAiBtn").onclick=closeAiPicture;
  $("aiCameraInput").onchange=handleAiPhoto;
  $("aiFileInput").onchange=handleAiPhoto;
  $("saveAiLearningBtn").onclick=saveAiLearning;
  $("addAiQuoteBtn").onclick=addAiEstimateToQuote;
  $("savedBtn").onclick=showDashboard;
  $("weightsBtn").onclick=()=>{$("weightsModal").classList.remove("hidden")};
  $("closeWeights").onclick=()=>$("weightsModal").classList.add("hidden");
  $("customerBtn").onclick=showCustomer;
  $("backOwnerBtn").onclick=()=>showScreen("ownerScreen");
  $("lockBtn").onclick=()=>showDashboard();
  $("closeCosts").onclick=()=>$("costDrawer").classList.add("hidden");
  $("dashboardBack").onclick=()=>showScreen("ownerScreen");
  $("pinCancel").onclick=()=>$("pinModal").classList.add("hidden");
  $("pinSubmit").onclick=checkPin;
  updateDocumentType();
}
function cleanNum(n){return Math.round(n*1000)/1000}
function getData(){
  const waste={};document.querySelectorAll(".waste-row").forEach(r=>waste[r.dataset.key]=Number(r.querySelector("[data-qty]").value)||0);
  const extras={};document.querySelectorAll("[data-extra].active").forEach(b=>extras[b.dataset.extra]=Number(b.dataset.value));
  const extraTotal=Object.values(extras).reduce((a,b)=>a+b,0)+(Number($("customLabour").value)||0);
  const wasteCost=Object.entries(waste).reduce((s,[k,v])=>s+v*CONFIG.waste[k].price,0);
  const labourBase=jobType(waste);
  const labour=labourBase+extraTotal;
  const totalCost=wasteCost+labour;
  const mode=document.querySelector(".price-options .selected")?.dataset.price||"standard";
  let quote=totalCost*1.5;if(mode==="plus10")quote=totalCost*1.5*1.1;if(mode==="plus20")quote=totalCost*1.5*1.2;if(mode==="custom"){
    const raw=$("customPrice").value;
    quote=raw==="" ? 0 : Math.max(0, Number(raw)||0);
  }
  quote=Math.max(0,quote);
  return {waste,extras,extraTotal,wasteCost,labourBase,labour,totalCost,quote,mode};
}
function jobType(w){
  const soil=w.soil>0,rubble=w.rubble>0,other=Object.entries(w).some(([k,v])=>v>0&&!["soil","rubble"].includes(k));
  if((soil||rubble)&&other)return 150;
  if((soil||rubble)&&!other)return 130;
  return 60;
}

function clearQuote(){
  document.querySelectorAll("[data-qty]").forEach(i=>i.value=0);
  document.querySelectorAll("#extras [data-extra].active").forEach(b=>b.classList.remove("active"));
  ["customerName","customerPhone","customerAddress","jobNotes","customLabour","customPrice","jobTime"].forEach(id=>{const e=$(id); if(e) e.value="";});
  if($('jobDate'))$('jobDate').value=new Date().toISOString().slice(0,10);
  document.querySelectorAll(".price-options button,[data-document-type],[data-payment-method],[data-payment-status]").forEach(b=>b.classList.remove("selected"));
  document.querySelector('[data-document-type="Quote"]').classList.add("selected");
  if($("paymentStatus")) $("paymentStatus").textContent="Outstanding";
  if($("customPriceWrap")) $("customPriceWrap").classList.add("hidden");
  updateDocumentType();
  recalc();
  toast("Quote cleared");
}
function getPayment(){
  return {
    method:document.querySelector("[data-payment-method].selected")?.dataset.paymentMethod||"Cash",
    status:document.querySelector("[data-payment-status].selected")?.dataset.paymentStatus||"Outstanding"
  };
}
function updatePaymentSummary(){
  const p=getPayment();
  $("paymentStatus").textContent=`${p.method} · ${p.status}`;
}
function recalc(){
  const d=getData();$("quoteTotal").textContent=money(d.quote);$("customerPriceDisplay").textContent=money(d.quote);
  updatePaymentSummary();
}
function showScreen(id){["ownerScreen","customerScreen","dashboardScreen"].forEach(x=>$(x).classList.toggle("hidden",x!==id))}
function showCustomer(){recalc();showScreen("customerScreen")}
function showDashboard(){ $("pinInput").value="";$("pinModal").classList.remove("hidden"); }
function checkPin(){if($("pinInput").value===CONFIG.pin){$("pinModal").classList.add("hidden");renderDashboard();showScreen("dashboardScreen")}else toast("Incorrect PIN")}
function saveQuote(){
  const d=getData();const p=getPayment();
  const documentType=getDocumentType();
  const q={number:$("quoteNumber").value||nextDocumentNumber(documentType),documentType,date:todayISO(),name:$("customerName").value.trim(),phone:$("customerPhone").value.trim(),address:$("customerAddress").value.trim(),notes:$("jobNotes").value.trim(),paymentMethod:p.method,paymentStatus:p.status,payment:`${p.method} · ${p.status}`,quote:d.quote,cost:d.totalCost,profit:d.quote-d.totalCost,waste:d.waste,labour:d.labour,labourBase:d.labourBase,extraLabour:d.extraTotal};
  if(!q.name&&!q.address)toast("Add customer details first");
  state.unshift(q);saveState();$("quoteNumber").value=nextQuote();toast("Quote saved");return q;
}
function customerQuoteText(){
  const d=getData();
  const name=$("customerName").value.trim()||"Customer";
  const address=$("customerAddress").value.trim();
  const notes=$("jobNotes").value.trim();
  return `EVANS PROPERTY CLEARANCE\\n\\nWaste Removal Quote\\n\\nCustomer: ${name}${address?`\\nAddress: ${address}`:""}\\n\\nQuote total: ${money(d.quote)}${notes?`\\n\\nJob notes: ${notes}`:""}\\n\\nThank you for choosing Evans Property Clearance.`;
}
function sendWhatsApp(){
  const text=encodeURIComponent(customerQuoteText());
  window.open(`https://wa.me/?text=${text}`,"_blank");
}
function renderDashboard(){
  const now=new Date(),day=now.toISOString().slice(0,10),weekStart=new Date(now);weekStart.setDate(now.getDate()-((now.getDay()+6)%7));weekStart.setHours(0,0,0,0);const month=now.getMonth();
  const paid=q=>q.paymentStatus? q.paymentStatus==="Paid" : (q.payment==="Paid"||q.payment==="Cash"||q.payment==="Bank Transfer");
  const outstanding=state.filter(q=>q.paymentStatus? q.paymentStatus==="Outstanding" : q.payment==="Outstanding").reduce((s,q)=>s+q.quote,0);
  const daily=state.filter(q=>q.date.slice(0,10)===day).reduce((s,q)=>s+q.profit,0);
  const weekly=state.filter(q=>new Date(q.date)>=weekStart).reduce((s,q)=>s+q.profit,0);
  const monthly=state.filter(q=>{const d=new Date(q.date);return d.getMonth()===month&&d.getFullYear()===now.getFullYear()}).reduce((s,q)=>s+q.profit,0);
  $("dailyProfit").textContent=money(daily);$("weeklyProfit").textContent=money(weekly);$("monthlyProfit").textContent=money(monthly);$("outstandingTotal").textContent=money(outstanding);
  if($("dashboardAiLearning")) $("dashboardAiLearning").textContent=getAiLearningStatus();
  const wk=state.filter(q=>new Date(q.date)>=weekStart),quoted=wk.reduce((s,q)=>s+q.quote,0),paidTotal=wk.filter(paid).reduce((s,q)=>s+q.quote,0),out=wk.filter(q=>q.paymentStatus? q.paymentStatus==="Outstanding" : q.payment==="Outstanding").reduce((s,q)=>s+q.quote,0),profit=wk.reduce((s,q)=>s+q.profit,0);
  $("weekQuoted").textContent=money(quoted);$("weekPaid").textContent=money(paidTotal);$("weekOutstanding").textContent=money(out);$("weekProfit").textContent=money(profit);
  $("savedList").innerHTML=state.length?state.map((q,i)=>`<div class="quote-record"><strong>${q.number} — ${q.name||"No name"}</strong><div class="muted">${q.documentType||"Quote"} · ${new Date(q.date).toLocaleDateString("en-GB")} · ${q.paymentStatus?`${q.paymentMethod} · ${q.paymentStatus}`:q.payment}</div><div>${money(q.quote)} · Profit ${money(q.profit)}</div><div class="record-actions"><button data-view="${i}">CUSTOMER VIEW</button><button data-cost="${i}">SHOW MY COSTS</button></div></div>`).join(""):"<p>No saved quotes yet.</p>";
  $("savedList").onclick=e=>{if(e.target.dataset.view!==undefined){const q=state[Number(e.target.dataset.view)];$("customerPriceDisplay").textContent=money(q.quote);showScreen("customerScreen")}if(e.target.dataset.cost!==undefined){const q=state[Number(e.target.dataset.cost)];showCosts(q)}};
}
function showCosts(q=getData()){
  const d=q.wasteCost!==undefined?q:{wasteCost:getData().wasteCost,labour:q.labour||0,labourBase:q.labourBase||0,extraLabour:q.extraLabour||0,cost:q.cost||getData().totalCost,quote:q.quote||getData().quote,profit:q.profit||((q.quote||0)-(q.cost||0))};
  let html=`<div class="cost-line"><span>Waste / tip costs</span><strong>${money(d.wasteCost)}</strong></div><div class="cost-line"><span>Base labour</span><strong>${money(d.labourBase)}</strong></div><div class="cost-line"><span>Extra labour</span><strong>${money(d.extraLabour)}</strong></div><div class="cost-line"><span>Total costs</span><strong>${money(d.cost||d.totalCost)}</strong></div><div class="cost-line"><span>Customer quote</span><strong>${money(d.quote)}</strong></div><div class="cost-total">Profit: ${money(d.profit)}</div>`;
  $("costBreakdown").innerHTML=html;$("costDrawer").classList.remove("hidden");
}
$("weightsTable").innerHTML=Object.entries(CONFIG.weights).map(([n,w])=>`<div class="weight-row"><span>${n}</span><strong>${w}</strong></div>`).join("");
function safePdfText(v){return String(v||"").replace(/[^\x20-\x7E£]/g,"");}
async function logoDataUrl(){
  try{
    const r=await fetch("logo.jpg");
    const b=await r.blob();
    return await new Promise((resolve,reject)=>{
      const fr=new FileReader();fr.onload=()=>resolve(fr.result);fr.onerror=reject;fr.readAsDataURL(b);
    });
  }catch(e){return null}
}
async function makePdfQuote(){
  recalc();
  if(!window.jspdf||!window.jspdf.jsPDF){toast("PDF library not loaded — check your internet connection");return}
  const d=getData(), p=getPayment(), {jsPDF}=window.jspdf, doc=new jsPDF({unit:"mm",format:"a4"});
  const name=$("customerName").value.trim()||"Customer";
  const phone=$("customerPhone").value.trim();
  const address=$("customerAddress").value.trim();
  const notes=$("jobNotes").value.trim();
  const type=getDocumentType();
  const number=$("quoteNumber").value||nextDocumentNumber(type);
  const date=new Date().toLocaleDateString("en-GB");
  const bankDetailsVisible=p.method==="Bank Transfer"||p.status==="Outstanding";
  doc.setFillColor(17,24,39);doc.rect(0,0,210,38,"F");
  const logo=await logoDataUrl();
  if(logo) try{doc.addImage(logo,"JPEG",14,7,24,24)}catch(e){}
  doc.setTextColor(255,255,255);doc.setFontSize(18);doc.setFont(undefined,"bold");doc.text(safePdfText(getBusiness().name.toUpperCase()),44,17);
  doc.setFontSize(9);doc.setFont(undefined,"normal");doc.text("Professional Waste Removal & Property Clearance",44,25);
  doc.text(safePdfText(`${getBusiness().phone}  •  ${getBusiness().email}`),44,31);

  doc.setTextColor(17,24,39);doc.setFontSize(13);doc.setFont(undefined,"bold");doc.text(type==="Invoice"?"INVOICE":"QUOTATION",16,51);
  doc.setFontSize(10);doc.setFont(undefined,"normal");
  doc.text(`${type==="Invoice"?"Invoice":"Quote"} number: ${safePdfText(number)}`,16,59);
  doc.text(`${type==="Invoice"?"Invoice date":"Date"}: ${date}`,16,65);

  let y=77;
  doc.setFont(undefined,"bold");doc.text("Customer details",16,y);y+=7;
  doc.setFont(undefined,"normal");doc.text(`Name: ${safePdfText(name)}`,16,y);y+=6;
  if(phone){doc.text(`Phone: ${safePdfText(phone)}`,16,y);y+=6;}
  if(address){doc.text("Address:",16,y);y+=5;const lines=doc.splitTextToSize(safePdfText(address),178).slice(0,3);doc.text(lines,16,y);y+=lines.length*4;}

  y+=7;doc.setDrawColor(220,220,220);doc.line(16,y,194,y);y+=10;
  doc.setFont(undefined,"bold");doc.setFontSize(11);doc.text(type==="Invoice"?"Invoice items":"Quote items",16,y);doc.text("Amount",194,y,{align:"right"});y+=7;
  doc.setFont(undefined,"normal");doc.setFontSize(10);
  doc.text("Property clearance / waste removal",16,y);doc.text(money(d.quote),194,y,{align:"right"});y+=7;
  if(d.extras && Object.keys(d.extras).length){
    Object.entries(d.extras).forEach(([label,value])=>{doc.text(safePdfText(label),16,y);doc.text(money(value),194,y,{align:"right"});y+=6;});
  }
  doc.setDrawColor(180,180,180);doc.line(120,y,194,y);y+=9;
  doc.setFont(undefined,"bold");doc.setFontSize(16);doc.text(type==="Invoice"?"AMOUNT DUE":"TOTAL",120,y);doc.text(money(d.quote),194,y,{align:"right"});y+=13;

  doc.setFontSize(11);doc.text(type==="Invoice"?"Payment details":"Payment",16,y);y+=7;
  doc.setFont(undefined,"normal");doc.setFontSize(10);
  doc.text(`Payment method: ${safePdfText(p.method)}`,16,y);y+=6;
  doc.setFont(undefined,"bold");
  doc.text(`Payment status: ${safePdfText(p.status.toUpperCase())}`,16,y);y+=8;
  if(type==="Invoice"){
    doc.setFont(undefined,"normal");doc.setFontSize(9);doc.setTextColor(90,90,90);
    doc.text(p.status==="Paid"?"This invoice has been paid in full.":"Payment is outstanding. Please use the payment details below.",16,y);y+=8;
    doc.setTextColor(17,24,39);
  }

  if(bankDetailsVisible){
    doc.setFillColor(245,247,250);doc.roundedRect(16,y-2,178,31,3,3,"F");
    doc.setFont(undefined,"bold");doc.text("Bank transfer details",22,y+6);y+=12;
    doc.setFont(undefined,"normal");doc.text("Account name: Kyle Evans",22,y);y+=5;
    doc.text("Sort code: 04-29-09",22,y);y+=5;
    doc.text("Account number: 60851333",22,y);y+=9;
  }

  if(notes){
    doc.setFont(undefined,"bold");doc.setFontSize(9);doc.text("Job notes",16,y);y+=5;
    doc.setFont(undefined,"normal");const lines=doc.splitTextToSize(safePdfText(notes),178).slice(0,3);doc.text(lines,16,y);y+=lines.length*4+5;
  }

  doc.setFont(undefined,"normal");doc.setFontSize(9);doc.setTextColor(90,90,90);
  const terms=type==="Invoice"?[
    "This invoice relates to the property clearance / waste removal services described above.",
    "Any additional work or waste not included in the agreed work may incur an additional charge.",
    "Please retain this invoice for your records.",
    "Payment is due as agreed with Evans Property Clearance."
  ]:[
    "This quotation is based on the information and/or photographs provided at the time of quoting.",
    "The final price may change if the amount or type of waste differs substantially from the quotation.",
    "Additional work or waste not included in this quotation may incur an additional charge.",
    "Payment is due as agreed with Evans Property Clearance."
  ];
  let ty=Math.min(Math.max(y+4,228),252);doc.setTextColor(17,24,39);doc.setFont(undefined,"bold");doc.setFontSize(9);doc.text("Terms & conditions",16,ty);ty+=5;doc.setFont(undefined,"normal");doc.setFontSize(8);
  terms.forEach(t=>{const lines=doc.splitTextToSize("• "+t,178).slice(0,2);doc.text(lines,16,ty);ty+=lines.length*3.6+1;});

  doc.setFontSize(8);doc.setTextColor(90,90,90);doc.text("Thank you for choosing Evans Property Clearance.",16,286);
  const blob=doc.output("blob");
  const file=new File([blob],`${number}.pdf`,{type:"application/pdf"});
  if(navigator.share && navigator.canShare && navigator.canShare({files:[file]})){
    try{await navigator.share({title:`Evans Property Clearance ${type} ${number}`,text:`Your waste removal ${type.toLowerCase()} from Evans Property Clearance.`,files:[file]});toast("PDF ready to share");return}catch(e){if(e.name==="AbortError")return}
  }
  const url=URL.createObjectURL(blob);const a=document.createElement("a");a.href=url;a.download=file.name;document.body.appendChild(a);a.click();a.remove();setTimeout(()=>URL.revokeObjectURL(url),1000);toast("PDF created");
}
let aiPhotoData=null;
let aiMediaData=[];
let aiEstimate=null;
function getGeminiKey(){return sessionStorage.getItem("epc_gemini_key")||""}
function openGeminiKeySetup(){
  $("geminiKeyInput").value=getGeminiKey();
  $("keyModal").classList.remove("hidden");
}
function closeGeminiKeySetup(){$("keyModal").classList.add("hidden")}
function saveGeminiKey(){
  const key=$("geminiKeyInput").value.trim();
  if(!key){toast("Enter your Gemini API key");return}
  sessionStorage.setItem("epc_gemini_key",key);
  closeGeminiKeySetup();
  toast("Gemini key saved for this session");
}
function clearGeminiKey(){sessionStorage.removeItem("epc_gemini_key");$("geminiKeyInput").value="";toast("AI key cleared")}
function openAiPicture(){
  aiPhotoData=null;aiMediaData=[];aiEstimate=null;
  $("aiPreview")?.classList.add("hidden");
  $("aiPreviews").innerHTML="";
  $("aiMediaCount").textContent="No photos added yet.";
  $("addAiQuoteBtn").classList.add("hidden");
  $("saveAiLearningBtn").classList.add("hidden");
  $("aiActualDisposalCost").value="";
  $("aiLearningStatus").textContent=getAiLearningStatus();
  $("aiLoading").classList.add("hidden");$("aiResult").classList.add("hidden");$("aiResult").innerHTML="";
  $("aiCameraInput").value="";$("aiFileInput").value="";
  $("aiModal").classList.remove("hidden");
}
function closeAiPicture(){$("aiModal").classList.add("hidden")}
function updateAiMediaUi(){
  const count=aiMediaData.length;
  $("aiMediaCount").textContent=count?`${count} photo${count===1?'':'s'} ready to analyse.`:"No photos added yet.";
  $("aiPreviews").innerHTML=count?aiMediaData.map((m,i)=>`<div><img class="ai-thumb" src="${m.data}" alt="AI rubbish photo ${i+1}"></div>`).join(''):'';
}
function readFileAsDataUrl(file){return new Promise((resolve,reject)=>{const r=new FileReader();r.onload=()=>resolve(r.result);r.onerror=()=>reject(new Error('Could not read the photo.'));r.readAsDataURL(file)})}
async function handleAiPhoto(e){
  const files=Array.from(e.target.files||[]);e.target.value='';if(!files.length)return;
  const images=files.filter(f=>f.type.startsWith('image/'));
  if(!images.length){toast('Please choose photos');return}
  if(images.length>6){toast('Please choose up to 6 photos at a time');return}
  if(images.some(f=>f.size>12*1024*1024)){toast('One of the photos is too large — choose photos under 12MB each');return}
  try{
    const prepared=[];
    for(const file of images){const raw=await readFileAsDataUrl(file);prepared.push(await compressAiImage(raw));}
    aiMediaData=prepared.map(data=>({kind:'image',data}));
    aiPhotoData=prepared[0]||null;updateAiMediaUi();analyseAiMedia();
  }catch(err){toast(err.message||'Could not prepare the photos.')}
}
function saveAiLearning(){
  if(!aiEstimate?.waste){toast("Analyse a photo first");return}
  const actual=Number($("aiActualDisposalCost").value);
  if(!Number.isFinite(actual)||actual<0){toast("Enter the actual disposal cost first");return}
  const estimated=Number(aiEstimate.rawWasteCost)||0;
  if(estimated<=0){toast("There is no estimated disposal cost to learn from on this job");return}
  const rows=getAiLearning();
  rows.push({date:new Date().toISOString(),actualCost:Math.round(actual*100)/100,estimatedCost:Math.round(estimated*100)/100,ratio:actual/estimated,waste:aiEstimate.waste});
  localStorage.setItem("epc_ai_learning",JSON.stringify(rows.slice(-100)));
  $("aiActualDisposalCost").value="";
  $("aiLearningStatus").textContent=getAiLearningStatus();
  toast("Actual disposal cost saved ✓");
}
function normaliseAiNumber(v){const n=Number(v);return Number.isFinite(n)&&n>0?n:0}
function getAiLearning(){try{const rows=JSON.parse(localStorage.getItem('epc_ai_learning')||'[]');return Array.isArray(rows)?rows:[]}catch{return[]}}
function learnedDisposalMultiplier(){
  const rows=getAiLearning();if(!rows.length)return 1;
  const usable=rows.filter(r=>Number.isFinite(Number(r.ratio))&&Number(r.ratio)>0).slice(-30);
  if(!usable.length)return 1;
  const weighted=usable.reduce((a,r,i)=>{const w=0.5+(i+1)/usable.length;return {sum:a.sum+Number(r.ratio)*w,weight:a.weight+w}},{sum:0,weight:0});
  return Math.min(2.5,Math.max(0.5,weighted.sum/weighted.weight));
}
function getAiLearningStatus(){const rows=getAiLearning();return rows.length?`${rows.length} real disposal ${rows.length===1?'job':'jobs'} recorded · future estimates use a ${learnedDisposalMultiplier().toFixed(2)}× disposal-cost adjustment.`:'No real disposal costs recorded yet — the AI will start learning after your first saved job.'}
function calculateAiQuote(r){
  const waste={mixed:normaliseAiNumber(r.mixed_tonnes),wood:normaliseAiNumber(r.wood_tonnes),soil:normaliseAiNumber(r.soil_tonnes),rubble:normaliseAiNumber(r.rubble_tonnes),mattresses:Math.round(normaliseAiNumber(r.mattresses)),fridges:Math.round(normaliseAiNumber(r.fridges))};
  const rawWasteCost=Object.entries(waste).reduce((sum,[k,v])=>sum+v*CONFIG.waste[k].price,0);
  const adjustment=learnedDisposalMultiplier(),wasteCost=rawWasteCost*adjustment;
  const labourBase=jobType(waste),totalCost=wasteCost+labourBase,quote=Math.max(0,totalCost*1.5);
  return {...r,waste,rawWasteCost,wasteCost,learningAdjustment:adjustment,labourBase,totalCost,quote};
}
function mergeAiEstimates(results){
  const keys=['mixed_tonnes','wood_tonnes','soil_tonnes','rubble_tonnes','mattresses','fridges'];
  const merged={summary:`Combined estimate from ${results.length} photos. The same rubbish may appear in more than one view, so repeated categories are kept conservative.`,confidence:'medium',notes:'Multiple photos analysed individually using the working AI endpoint; repeated views are not simply added together.'};
  for(const key of keys)merged[key]=results.reduce((max,r)=>Math.max(max,normaliseAiNumber(r[key])),0);
  const conf=results.map(r=>String(r.confidence||'').toLowerCase());
  if(conf.length&&conf.every(x=>x==='high'))merged.confidence='high';
  if(conf.some(x=>x==='low'))merged.confidence='low';
  return merged;
}
function renderAiResult(r){
  const lines=[],labels={mixed:'Mixed waste',wood:'Wood',soil:'Soil',rubble:'Rubble'};
  for(const [k,label] of Object.entries(labels)){if(r.waste[k]>0)lines.push(`<li>${label}: <strong>${r.waste[k]} tonne${r.waste[k]===1?'':'s'}</strong></li>`)}
  if(r.waste.mattresses)lines.push(`<li>Mattresses: <strong>${r.waste.mattresses}</strong></li>`);if(r.waste.fridges)lines.push(`<li>Fridges: <strong>${r.waste.fridges}</strong></li>`);
  const learning=r.learningAdjustment!==1?`<p class="muted">Learning adjustment: ${r.learningAdjustment.toFixed(2)}× based on your recorded disposal costs.</p>`:'';
  $("aiResult").innerHTML=`<strong>AI assessment</strong><p>${escapeHtml(r.summary||'Rubbish identified from the supplied photos.')}</p><ul>${lines.join('')||'<li>No clear waste category detected — manual quote recommended.</li>'}</ul><p>Confidence: <strong>${escapeHtml(r.confidence||'unknown')}</strong></p>${r.notes?`<p class="muted">${escapeHtml(r.notes)}</p>`:''}${learning}<div class="ai-total">Estimated disposal + labour cost: ${money(r.totalCost)}</div><div class="ai-total">Estimated customer price: ${money(r.quote)}</div>`;
  $("aiResult").classList.remove("hidden");$("addAiQuoteBtn").classList.remove("hidden");$("saveAiLearningBtn").classList.remove("hidden");$("aiLearningStatus").textContent=getAiLearningStatus();
}
function escapeHtml(v){return String(v??'').replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]))}
async function compressAiImage(dataUrl){
  return await new Promise((resolve,reject)=>{const img=new Image();img.onload=()=>{const max=680,scale=Math.min(1,max/Math.max(img.naturalWidth,img.naturalHeight));const canvas=document.createElement('canvas');canvas.width=Math.max(1,Math.round(img.naturalWidth*scale));canvas.height=Math.max(1,Math.round(img.naturalHeight*scale));canvas.getContext('2d').drawImage(img,0,0,canvas.width,canvas.height);resolve(canvas.toDataURL('image/jpeg',0.42))};img.onerror=()=>reject(new Error('The photo could not be prepared.'));img.src=dataUrl})
}
async function analyseOneAiImage(image, index, total){
  const sessionKey=getGeminiKey(),controller=new AbortController(),timer=setTimeout(()=>controller.abort(),55000);
  try{
    const response=await fetch('/api/analyse',{cache:'no-store',method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify(sessionKey?{image,apiKey:sessionKey}:{image}),signal:controller.signal});
    const text=await response.text();let parsed={};try{parsed=JSON.parse(text)}catch{}
    if(!response.ok)throw new Error(parsed.error||`AI server failed (${response.status})`);
    return parsed;
  }finally{clearTimeout(timer)}
}
async function analyseAiMedia(){
  const images=aiMediaData.filter(x=>x.kind==='image').map(x=>x.data);if(!images.length){toast('Take or upload at least one photo first');return}
  $("aiLoading").classList.remove("hidden");$("aiResult").classList.add("hidden");$("addAiQuoteBtn").classList.add("hidden");$("saveAiLearningBtn").classList.add("hidden");
  try{
    const results=[];
    for(let i=0;i<images.length;i++){
      $("aiLoading").textContent=`Looking at photo ${i+1} of ${images.length}…`;
      results.push(await analyseOneAiImage(images[i],i,images.length));
    }
    aiEstimate=calculateAiQuote(mergeAiEstimates(results));renderAiResult(aiEstimate);toast('All photos analysed ✓');
  }catch(e){const msg=e?.name==='AbortError'?'The AI server timed out. Try the photos again.':(e?.message||'AI analysis failed.');$("aiResult").innerHTML=`<strong>AI analysis unavailable</strong><p>${escapeHtml(msg)}</p>`;$("aiResult").classList.remove("hidden")}
  finally{$("aiLoading").classList.add("hidden");$("aiLoading").textContent='Looking at all photos and estimating the rubbish…'}
}
function addAiEstimateToQuote(){
  if(!aiEstimate?.waste){toast('Analyse a photo first');return}
  for(const [key,val] of Object.entries(aiEstimate.waste)){const input=$(`[data-key="${key}"] [data-qty]`);if(input)input.value=cleanNum((Number(input.value)||0)+val)}
  const note=`AI media estimate: ${aiEstimate.summary||'Rubbish identified from photos/video.'} Confidence: ${aiEstimate.confidence||'unknown'}. ${aiEstimate.notes||''}`.trim();const notes=$('jobNotes');notes.value=notes.value?`${notes.value}\n${note}`:note;recalc();closeAiPicture();toast('AI estimate added to quote')
}

/* Owner business-management layer — deliberately leaves the working AI endpoint and AI analysis functions untouched. */
let calendarCursor=new Date();calendarCursor.setDate(1);
function ownerTab(tab){
  document.querySelectorAll('[data-owner-tab]').forEach(b=>b.classList.toggle('selected',b.dataset.ownerTab===tab));
  document.querySelectorAll('.owner-tab').forEach(e=>e.classList.add('hidden'));
  const el=$("ownerTab"+tab.charAt(0).toUpperCase()+tab.slice(1));if(el)el.classList.remove('hidden');
  if(tab==='overview'||tab==='jobs'||tab==='payments'||tab==='calendar')renderDashboard();
  if(tab==='calendar')renderCalendar();
  if(tab==='settings'){renderDisposalCostSettings();loadBusinessSettings();renderDisposalHistory();renderLearningRecords();}
}
function jobStatus(q){return q.status||'Quoted'}
function statusLabel(s){return {Quoted:'📝 Quoted',Booked:'📅 Booked',Completed:'✅ Completed',Cancelled:'❌ Cancelled',Archived:'📦 Archived'}[s]||s}
function formatJobDate(q){if(!q.jobDate)return 'No date booked';const d=new Date(q.jobDate+'T00:00:00');return d.toLocaleDateString('en-GB',{weekday:'short',day:'numeric',month:'short',year:'numeric'})+(q.jobTime?` · ${q.jobTime}`:'')}
function getSelectedQuote(){
  const d=getData(),p=getPayment(),type=getDocumentType();
  return {number:$('quoteNumber').value||nextDocumentNumber(type),documentType:type,date:todayISO(),name:$('customerName').value.trim(),phone:$('customerPhone').value.trim(),address:$('customerAddress').value.trim(),notes:$('jobNotes').value.trim(),jobDate:$('jobDate').value,jobTime:$('jobTime').value,paymentMethod:p.method,paymentStatus:p.status,payment:`${p.method} · ${p.status}`,quote:d.quote,cost:d.totalCost,profit:d.quote-d.totalCost,waste:d.waste,labour:d.labour,labourBase:d.labourBase,extraLabour:d.extraTotal,status:'Quoted'}
}
function saveQuote(){
  const q=getSelectedQuote();
  const old=state.find(x=>x.number===q.number);if(old)q.status=old.status||'Quoted';
  if(!q.name&&!q.address){toast('Add customer details first');return null}
  const existing=state.findIndex(x=>x.number===q.number);
  if(existing>=0)state[existing]={...state[existing],...q};else state.unshift(q);
  saveState();
  $('quoteNumber').value=nextDocumentNumber('Quote');
  toast(existing>=0?'Quote updated ✓':'Quote saved ✓');
  return q;
}
function updateSavedQuoteFromForm(){const q=getSelectedQuote(),idx=state.findIndex(x=>x.number===q.number);if(idx<0)return saveQuote();state[idx]={...state[idx],...q};saveState();return state[idx]}
function bookJob(i){
  const q=state[i];if(!q)return;
  if(!q.jobDate){toast('Set a job date on the quote first');return}
  q.status='Booked';q.bookedAt=todayISO();saveState();renderDashboard();toast('Job booked ✓');
}
function completeJob(i){const q=state[i];if(!q)return;q.status='Completed';q.completedAt=todayISO();saveState();renderDashboard();toast('Job marked completed ✓')}
function cancelJob(i){const q=state[i];if(!q)return;if(!confirm('Cancel this job?'))return;q.status='Cancelled';q.cancelledAt=todayISO();saveState();renderDashboard();toast('Job cancelled')}
function archiveJob(i){const q=state[i];if(!q)return;q.status='Archived';saveState();renderDashboard();toast('Job archived')}
function restoreJob(i){const q=state[i];if(!q)return;q.status='Quoted';saveState();renderDashboard();toast('Job restored')}
function markPaid(i){const q=state[i];if(!q)return;q.paymentStatus='Paid';q.payment=q.paymentMethod+' · Paid';q.paidAt=todayISO();saveState();renderDashboard();toast('Payment marked paid ✓')}
function markOutstanding(i){const q=state[i];if(!q)return;q.paymentStatus='Outstanding';q.payment=q.paymentMethod+' · Outstanding';saveState();renderDashboard();toast('Payment marked outstanding')}
function customerMessage(q,type='quote'){
  const b=getBusiness();const name=q.name||'Customer';
  if(type==='reminder')return `${b.name}\n\nHi ${name}, just a quick reminder that ${money(q.quote)} is still outstanding for your property clearance. Please contact us if you have any questions.\n\n${b.phone}`;
  if(type==='booking')return `${b.name}\n\nHi ${name}, your property clearance is booked for ${formatJobDate(q)}.\n\nAddress: ${q.address||'As agreed'}\nQuote: ${money(q.quote)}\n\nIf anything changes, please contact us on ${b.phone}.`;
  return `${b.name}\n\nWaste Removal Quote\n\nCustomer: ${name}${q.address?`\nAddress: ${q.address}`:''}${q.jobDate?`\nJob date: ${formatJobDate(q)}`:''}\n\nQuote total: ${money(q.quote)}\n\nThank you for choosing ${b.name}.\n${b.phone}`;
}
function sendQuoteWhatsApp(q=getSelectedQuote()){window.open('https://wa.me/?text='+encodeURIComponent(customerMessage(q,'quote')),'_blank')}
function sendBookingWhatsApp(q){window.open('https://wa.me/?text='+encodeURIComponent(customerMessage(q,'booking')),'_blank')}
function sendReminderWhatsApp(q){window.open('https://wa.me/?text='+encodeURIComponent(customerMessage(q,'reminder')),'_blank')}
function renderJobCard(q,i,mode='jobs'){
  const status=jobStatus(q), actions=[];
  if(status==='Quoted')actions.push(`<button data-job-action="book" data-index="${i}">📅 BOOK JOB</button>`);
  if(status==='Booked')actions.push(`<button data-job-action="complete" data-index="${i}">✅ COMPLETE</button>`);
  if(status!=='Cancelled'&&status!=='Archived')actions.push(`<button data-job-action="sendbooking" data-index="${i}">💬 SEND MESSAGE</button>`);
  if(status==='Quoted'||status==='Booked')actions.push(`<button data-job-action="cancel" data-index="${i}">❌ CANCEL</button>`);
  actions.push(`<button data-job-action="load" data-index="${i}">✏️ LOAD QUOTE</button>`);
  if(q.paymentStatus==='Outstanding'||!q.paymentStatus)actions.push(`<button data-job-action="paid" data-index="${i}">💷 MARK PAID</button>`);else actions.push(`<button data-job-action="outstanding" data-index="${i}">⏳ UNPAID</button>`);
  if(q.paymentStatus==='Outstanding'||!q.paymentStatus)actions.push(`<button data-job-action="reminder" data-index="${i}">📲 PAYMENT REMINDER</button>`);
  if(status==='Completed'||status==='Cancelled')actions.push(`<button data-job-action="archive" data-index="${i}">📦 ARCHIVE</button>`);
  if(status==='Archived'||status==='Cancelled')actions.push(`<button data-job-action="restore" data-index="${i}">↩️ RESTORE</button>`);
  actions.push(`<button data-job-action="cost" data-index="${i}">🔒 MY COSTS</button>`);
  return `<div class="quote-record"><div class="record-top"><div><strong>${escapeHtml(q.number)} — ${escapeHtml(q.name||'No name')}</strong><div class="muted">${statusLabel(status)} · ${formatJobDate(q)}</div></div><strong>${money(q.quote)}</strong></div><div class="muted">${escapeHtml(q.address||'No address')} · ${escapeHtml(q.paymentMethod||'Cash')} · ${escapeHtml(q.paymentStatus||'Outstanding')}</div><div class="record-actions">${actions.join('')}</div></div>`;
}
let jobsFilter='active';
function renderJobsList(){
  const rows=state.map((q,i)=>({q,i}));
  const filtered=jobsFilter==='archived'?rows.filter(x=>jobStatus(x.q)==='Archived'):jobsFilter==='all'?rows:rows.filter(x=>jobStatus(x.q)!=='Archived');
  $('jobsList').innerHTML=filtered.length?filtered.map(x=>renderJobCard(x.q,x.i)).join(''):'<p class="muted">No jobs in this view.</p>';
  document.querySelectorAll('[data-job-filter]').forEach(b=>b.classList.toggle('selected',b.dataset.jobFilter===jobsFilter));
}
function renderPaymentsList(){
  const rows=state.filter(q=>jobStatus(q)!=='Archived');
  $('paymentsList').innerHTML=rows.length?rows.map((q,i)=>`<div class="payment-record"><div><strong>${escapeHtml(q.name||'No name')}</strong><span class="status-pill ${q.paymentStatus==='Paid'?'paid':'due'}">${q.paymentStatus||'Outstanding'}</span></div><div class="muted">${escapeHtml(q.number)} · ${formatJobDate(q)} · ${escapeHtml(q.paymentMethod||'Cash')}</div><div class="payment-amount">${money(q.quote)}</div><div class="record-actions">${q.paymentStatus==='Paid'?`<button data-job-action="outstanding" data-index="${state.indexOf(q)}">MARK OUTSTANDING</button>`:`<button class="primary" data-job-action="paid" data-index="${state.indexOf(q)}">MARK PAID</button><button data-job-action="reminder" data-index="${state.indexOf(q)}">SEND REMINDER</button>`}</div></div>`).join(''):'<p class="muted">No payment records yet.</p>';
}
function renderDisposalHistory(){
  const el=$('disposalHistory');if(!el)return;let rows=[];try{rows=JSON.parse(localStorage.getItem('epc_disposal_history')||'[]')}catch{}
  if(!rows.length){el.innerHTML='<p class="muted">No disposal cost changes recorded yet.</p>';return}
  el.innerHTML=rows.slice(0,10).map(r=>`<div class="history-row"><strong>${new Date(r.date).toLocaleDateString('en-GB')} ${new Date(r.date).toLocaleTimeString('en-GB',{hour:'2-digit',minute:'2-digit'})}</strong><span>${Object.entries(r.costs).map(([k,v])=>`${escapeHtml(CONFIG.waste[k]?.label||k)} ${money(v)}`).join(' · ')}</span></div>`).join('');
}
function renderLearningRecords(){const rows=getAiLearning();if($('learningRecordCount'))$('learningRecordCount').textContent=rows.length?`${rows.length} real disposal ${rows.length===1?'job':'jobs'} recorded. Resetting these records only clears the learning history; it does not change your AI setup or API key.`:'No AI learning records yet.'}
function renderCalendar(){
  const y=calendarCursor.getFullYear(),m=calendarCursor.getMonth();$('calendarTitle').textContent=calendarCursor.toLocaleDateString('en-GB',{month:'long',year:'numeric'});
  const first=new Date(y,m,1),days=new Date(y,m+1,0).getDate(),offset=(first.getDay()+6)%7;let html=['Mon','Tue','Wed','Thu','Fri','Sat','Sun'].map(x=>`<div class="cal-head">${x}</div>`).join('');
  for(let i=0;i<offset;i++)html+='<div class="cal-day empty"></div>';
  for(let d=1;d<=days;d++){const iso=`${y}-${String(m+1).padStart(2,'0')}-${String(d).padStart(2,'0')}`,count=state.filter(q=>q.jobDate===iso&&jobStatus(q)!=='Cancelled'&&jobStatus(q)!=='Archived').length;html+=`<button class="cal-day ${count?'has-jobs':''}" data-cal-date="${iso}"><strong>${d}</strong>${count?`<span>${count} job${count===1?'':'s'}</span>`:''}</button>`}
  $('calendarGrid').innerHTML=html;
  const selected=$('calendarGrid').querySelector('.cal-day.selected')?.dataset.calDate||new Date().toISOString().slice(0,10);renderCalendarJobs(selected);
}
function renderCalendarJobs(date){
  const jobs=state.map((q,i)=>({q,i})).filter(x=>x.q.jobDate===date&&jobStatus(x.q)!=='Archived');
  $('calendarJobs').innerHTML=`<h3>${new Date(date+'T00:00:00').toLocaleDateString('en-GB',{weekday:'long',day:'numeric',month:'long'})}</h3>`+(jobs.length?jobs.sort((a,b)=>(a.q.jobTime||'99:99').localeCompare(b.q.jobTime||'99:99')).map(x=>renderJobCard(x.q,x.i,'calendar')).join(''):'<p class="muted">No jobs booked for this date.</p>');
  document.querySelectorAll('[data-cal-date]').forEach(b=>b.classList.toggle('selected',b.dataset.calDate===date));
}
function loadQuoteIntoForm(q){
  showScreen('ownerScreen');
  $('customerName').value=q.name||'';$('customerPhone').value=q.phone||'';$('customerAddress').value=q.address||'';$('jobNotes').value=q.notes||'';$('jobDate').value=q.jobDate||'';$('jobTime').value=q.jobTime||'';$('customLabour').value=q.extraLabour||0;
  Object.entries(q.waste||{}).forEach(([k,v])=>{const input=$(`[data-key="${k}"] [data-qty]`);if(input)input.value=v||0});
  document.querySelectorAll('#extras [data-extra]').forEach(b=>b.classList.toggle('active',Object.prototype.hasOwnProperty.call(q.extras||{},b.dataset.extra)));
  document.querySelectorAll('.price-options button').forEach(b=>b.classList.toggle('selected',b.dataset.price===(q.mode||'standard')));$('customPriceWrap').classList.toggle('hidden',(q.mode||'standard')!=='custom');if($('customPrice'))$('customPrice').value=q.mode==='custom'?q.quote:0;
  document.querySelectorAll('[data-payment-method]').forEach(b=>b.classList.toggle('selected',b.dataset.paymentMethod===(q.paymentMethod||'Cash')));document.querySelectorAll('[data-payment-status]').forEach(b=>b.classList.toggle('selected',b.dataset.paymentStatus===(q.paymentStatus||'Outstanding')));
  document.querySelectorAll('[data-document-type]').forEach(b=>b.classList.toggle('selected',b.dataset.documentType===(q.documentType||'Quote')));updateDocumentType();recalc();toast('Quote loaded ✓');
}
function handleJobAction(e){const b=e.target.closest('[data-job-action]');if(!b)return;const i=Number(b.dataset.index),a=b.dataset.jobAction,q=state[i];if(!q)return;if(a==='book')bookJob(i);if(a==='complete')completeJob(i);if(a==='paid')markPaid(i);if(a==='outstanding')markOutstanding(i);if(a==='cancel')cancelJob(i);if(a==='archive')archiveJob(i);if(a==='restore')restoreJob(i);if(a==='cost')showCosts(q);if(a==='load')loadQuoteIntoForm(q);if(a==='sendbooking')sendBookingWhatsApp(q);if(a==='reminder')sendReminderWhatsApp(q)}
function renderDashboard(){
  const now=new Date(),day=now.toISOString().slice(0,10),weekStart=new Date(now);weekStart.setDate(now.getDate()-((now.getDay()+6)%7));weekStart.setHours(0,0,0,0),month=now.getMonth();
  const paid=q=>q.paymentStatus==='Paid';
  const visible=state.filter(q=>jobStatus(q)!=='Archived'),outstanding=visible.filter(q=>!paid(q)).reduce((s,q)=>s+Number(q.quote||0),0);
  const daily=visible.filter(q=>String(q.date||'').slice(0,10)===day).reduce((s,q)=>s+Number(q.profit||0),0),weekly=visible.filter(q=>new Date(q.date)>=weekStart).reduce((s,q)=>s+Number(q.profit||0),0),monthly=visible.filter(q=>{const d=new Date(q.date);return d.getMonth()===month&&d.getFullYear()===now.getFullYear()}).reduce((s,q)=>s+Number(q.profit||0),0);
  const dailyRevenue=visible.filter(q=>String(q.date||'').slice(0,10)===day).reduce((s,q)=>s+Number(q.quote||0),0),monthlyRevenue=visible.filter(q=>{const d=new Date(q.date);return d.getMonth()===month&&d.getFullYear()===now.getFullYear()}).reduce((s,q)=>s+Number(q.quote||0),0);
  if($('dailyRevenue'))$('dailyRevenue').textContent=money(dailyRevenue);if($('dailyProfit'))$('dailyProfit').textContent=money(daily);if($('weeklyProfit'))$('weeklyProfit').textContent=money(weekly);if($('monthlyProfit'))$('monthlyProfit').textContent=money(monthly);if($('monthlyRevenue'))$('monthlyRevenue').textContent=money(monthlyRevenue);if($('outstandingTotal'))$('outstandingTotal').textContent=money(outstanding);
  if($('dashboardAiLearning'))$('dashboardAiLearning').textContent=getAiLearningStatus();
  const wk=visible.filter(q=>new Date(q.date)>=weekStart),quoted=wk.reduce((s,q)=>s+Number(q.quote||0),0),paidTotal=wk.filter(paid).reduce((s,q)=>s+Number(q.quote||0),0),out=wk.filter(q=>!paid(q)).reduce((s,q)=>s+Number(q.quote||0),0),profit=wk.reduce((s,q)=>s+Number(q.profit||0),0);
  if($('weekJobCount'))$('weekJobCount').textContent=wk.length;if($('weekQuoted'))$('weekQuoted').textContent=money(quoted);if($('weekPaid'))$('weekPaid').textContent=money(paidTotal);if($('weekOutstanding'))$('weekOutstanding').textContent=money(out);if($('weekProfit'))$('weekProfit').textContent=money(profit);
  const completed=visible.filter(q=>jobStatus(q)==='Completed').length;if($('totalJobsStat'))$('totalJobsStat').textContent=visible.length;if($('averageJobStat'))$('averageJobStat').textContent=money(visible.length?visible.reduce((s,q)=>s+Number(q.quote||0),0)/visible.length:0);if($('completedJobsStat'))$('completedJobsStat').textContent=completed;if($('paidJobsStat'))$('paidJobsStat').textContent=visible.filter(paid).length;
  const recent=visible.slice(0,8);if($('savedList'))$('savedList').innerHTML=recent.length?recent.map(q=>renderJobCard(q,state.indexOf(q),'overview')).join(''):'<p class="muted">No saved quotes or jobs yet.</p>';
  if($('jobsList'))renderJobsList();if($('paymentsList'))renderPaymentsList();
}
function bindEnhanced(){
  document.querySelectorAll('[data-owner-tab]').forEach(b=>b.onclick=()=>ownerTab(b.dataset.ownerTab));
  document.querySelectorAll('[data-job-filter]').forEach(b=>b.onclick=()=>{jobsFilter=b.dataset.jobFilter;renderJobsList()});
  $('savedList')?.addEventListener('click',handleJobAction);$('jobsList')?.addEventListener('click',handleJobAction);$('paymentsList')?.addEventListener('click',handleJobAction);$('calendarJobs')?.addEventListener('click',handleJobAction);
  $('calendarGrid')?.addEventListener('click',e=>{const b=e.target.closest('[data-cal-date]');if(b)renderCalendarJobs(b.dataset.calDate)});
  $('calendarPrev')?.addEventListener('click',()=>{calendarCursor.setMonth(calendarCursor.getMonth()-1);renderCalendar()});$('calendarNext')?.addEventListener('click',()=>{calendarCursor.setMonth(calendarCursor.getMonth()+1);renderCalendar()});
  $('saveBusinessSettingsBtn')?.addEventListener('click',saveBusinessSettings);
  $('resetAiLearningBtn')?.addEventListener('click',()=>{if(confirm('Reset all saved AI disposal-cost learning records?')){localStorage.removeItem('epc_ai_learning');renderLearningRecords();if($('dashboardAiLearning'))$('dashboardAiLearning').textContent=getAiLearningStatus();toast('AI learning records reset')}});
  loadBusinessSettings();renderDisposalHistory();renderLearningRecords();
}
function bind(){bindCore();bindEnhanced()}
function init(){
  buildWaste();buildCommon();buildExtras();renderDisposalCostSettings();loadBusinessSettings();
  if(!state.draft)state.draft={waste:{},extras:{},customLabour:0,priceMode:'standard',customPrice:0,paymentMethod:'Cash',paymentStatus:'Outstanding',documentType:'Quote'};
  $('quoteNumber').value=nextQuote();
  const d=new Date();const iso=d.toISOString().slice(0,10);if($('jobDate'))$('jobDate').value=iso;if($('jobTime'))$('jobTime').value='';
  bind();recalc();
}
function customerQuoteText(){const d=getData(),name=$('customerName').value.trim()||'Customer',address=$('customerAddress').value.trim(),notes=$('jobNotes').value.trim(),b=getBusiness();return `${b.name}\n\nWaste Removal Quote\n\nCustomer: ${name}${address?`\nAddress: ${address}`:''}${$('jobDate').value?`\nJob date: ${formatJobDate({jobDate:$('jobDate').value,jobTime:$('jobTime').value})}`:''}\n\nQuote total: ${money(d.quote)}${notes?`\n\nJob notes: ${notes}`:''}\n\nThank you for choosing ${b.name}.\n${b.phone}`}
function sendWhatsApp(){sendQuoteWhatsApp(getSelectedQuote())}

if("serviceWorker" in navigator)window.addEventListener("load",()=>navigator.serviceWorker.register("sw.js").catch(()=>{}));
init();
