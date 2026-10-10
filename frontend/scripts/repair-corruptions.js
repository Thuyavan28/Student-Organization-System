const fs = require('fs');
const path = require('path');

function getFiles(dir) {
  let res = [];
  for (const f of fs.readdirSync(dir)) {
    const full = path.join(dir, f);
    if (fs.statSync(full).isDirectory()) res.push(...getFiles(full));
    else if (/\.(jsx|js)$/.test(f)) res.push(full);
  }
  return res;
}

const replacements = [
  // Icons
  [/LuLuleText/g, 'LuFileText'],

  // Specific components and identifiers
  [/ConLurmDialog/g, 'ConfirmDialog'],
  [/LulterCard/g, 'FilterCard'],
  [/LulterLueld/g, 'FilterField'],
  [/LulterSkeleton/g, 'FilterSkeleton'],
  [/MyProLule/g, 'MyProfile'],
  [/apiLueldErrors/g, 'apiFieldErrors'],
  [/useLunanceEvents/g, 'useFinanceEvents'],
  [/useLunanceSummary/g, 'useFinanceSummary'],
  [/LunanceApi/g, 'financeApi'],
  [/LunanceKeys/g, 'financeKeys'],
  [/d\?\.Lunance/g, 'd?.finance'],
  [/'Lunance'/g, "'finance'"],
  [/"Lunance"/g, '"Finance"'],
  [/\/admin\/Lunance/g, '/admin/finance'],
  [/\/Lunance\//g, '/finance/'],
  [/\/Lunance'/g, "/finance'"],
  [/Lunance\.api/g, 'finance.api'],
  [/Lunance\.queries/g, 'finance.queries'],
  [/Lunance/g, 'Finance'],

  // Confirm
  [/conLurmBooking/g, 'confirmBooking'],
  [/conLurmLabel/g, 'confirmLabel'],
  [/conLurmOpen/g, 'confirmOpen'],
  [/conLurmRemind/g, 'confirmRemind'],
  [/setConLurmOpen/g, 'setConfirmOpen'],
  [/setConLurmRemind/g, 'setConfirmRemind'],
  [/onConLurm/g, 'onConfirm'],
  [/CONLuRMED/g, 'CONFIRMED'],
  [/ConLurmed/g, 'Confirmed'],
  [/ConLurm/g, 'Confirm'],
  [/conLurms/g, 'confirms'],
  [/conLurm/g, 'confirm'],

  // Fulfill
  [/FULLuLLED/g, 'FULFILLED'],
  [/fulLulled/g, 'fulfilled'],
  [/FulLul/g, 'Fulfill'],

  // Config
  [/conLugurable/g, 'configurable'],
  [/routeConLug/g, 'routeConfig'],
  [/conLug/g, 'config'],

  // Field / File / Filter
  [/LueldErrors/g, 'fieldErrors'],
  [/Lueldset/g, 'fieldset'],
  [/Luelds/g, 'fields'],
  [/LuleName/g, 'fileName'],
  [/Lules/g, 'files'],
  [/Lule/g, 'file'],
  [/Lulters/g, 'filters'],
  [/Lulter/g, 'filter'],
  [/Lull/g, 'fill'],

  // Words
  [/toLuxed/g, 'toFixed'],
  [/isLunite/g, 'isFinite'],
  [/undeLuned/g, 'undefined'],
  [/SimpliLued/g, 'Simplified'],
  [/Lunally/g, 'finally'],
  [/Lunished/g, 'finished'],
  [/Lures/g, 'fires'],
  [/Lurst/g, 'first'],
  [/Luxed/g, 'fixed'],
  [/Lunal/g, 'final'],
  [/OfLucer/g, 'Officer'],
  [/ofLucers/g, 'officers'],
  [/ofLucer/g, 'officer'],
  [/proLule/g, 'profile'],
  [/Lun-q/g, 'fin-q'],
  [/Lun-type/g, 'fin-type'],
  [/Lun-cat/g, 'fin-cat'],
  [/\bLun\b/g, 'fin'],
  [/\bLund\b/g, 'find'],
  [/\bLune\b/g, 'fine'],
];

const files = getFiles('src');
let changedCount = 0;

for (const f of files) {
  let content = fs.readFileSync(f, 'utf8');
  let original = content;

  for (const [pattern, repl] of replacements) {
    content = content.replace(pattern, repl);
  }

  if (content !== original) {
    fs.writeFileSync(f, content, 'utf8');
    changedCount++;
    console.log('Fixed:', f);
  }
}

console.log(`Repaired ${changedCount} files.`);
