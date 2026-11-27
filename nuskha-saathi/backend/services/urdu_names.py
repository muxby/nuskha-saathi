"""Urdu-script spellings of medicine names, for the voice only.

The Urdu neural voices read Urdu script. A brand name left in Latin letters
is skipped without any error whenever the voice does not know the word, so a
spoken dose line could lose the name of the medicine. Every name is therefore
spelt in Urdu script before synthesis.

The spelling is deterministic: a curated table for names whose customary Urdu
spelling differs from the letter rules, then fixed letter rules. Nothing here
is shown on screen; cards keep the name exactly as printed on the strip.
"""

from __future__ import annotations

import re

LETTER_NAMES = {
    "a": "اے", "b": "بی", "c": "سی", "d": "ڈی", "e": "ای", "f": "ایف", "g": "جی",
    "h": "ایچ", "i": "آئی", "j": "جے", "k": "کے", "l": "ایل", "m": "ایم", "n": "این",
    "o": "او", "p": "پی", "q": "کیو", "r": "آر", "s": "ایس", "t": "ٹی", "u": "یو",
    "v": "وی", "w": "ڈبلیو", "x": "ایکس", "y": "وائی", "z": "زیڈ",
}

# Whole words whose customary spelling the letter rules would not produce.
WORDS = {
    # Common words inside brand and salt names
    "acid": "ایسڈ", "sodium": "سوڈیم", "potassium": "پوٹاشیم", "calcium": "کیلشیم",
    "lithium": "لیتھیم", "chloride": "کلورائیڈ", "carbonate": "کاربونیٹ", "sulfate": "سلفیٹ",
    "ferrous": "فیرس", "human": "ہیومن", "insulin": "انسولین", "extra": "ایکسٹرا",
    "extend": "ایکسٹینڈ", "forte": "فورٹ", "retard": "ریٹارڈ", "met": "میٹ", "slow": "سلو",
    "neo": "نیو", "theo": "تھیو", "dur": "ڈیور", "co": "کو", "continus": "کنٹینس",
    "folic": "فولک", "fusidic": "فیوسیڈک", "mefenamic": "میفینامک", "tranexamic": "ٹرینیکسامک",
    "nitrate": "نائٹریٹ", "antibiotic": "اینٹی بایوٹک", "generic": "جینرک",
    "mg": "ملی گرام", "ml": "ملی لیٹر", "qr": "کیو آر", "pdf": "پی ڈی ایف",
    # Brands
    "aciphex": "ایسی فیکس", "acivir": "ایسی ویر", "actrapid": "ایکٹراپڈ", "adalat": "اڈالٹ",
    "aldactone": "ایلڈیکٹون", "aldomet": "ایلڈومیٹ", "amaryl": "اماریل", "ambulax": "ایمبیولیکس",
    "amoxil": "اموکسل",
    "angised": "اینجی سیڈ", "ascard": "ایسکارڈ", "asthalin": "استھالین", "augmentin": "آگمنٹن",
    "augpen": "آگ پین", "avelox": "ایویلوکس", "avil": "ایول", "avodart": "ایووڈارٹ",
    "bactrim": "بیکٹرم", "betaloc": "بیٹالوک", "brufen": "بروفین", "buscopan": "بسکوپان",
    "cafergot": "کیفرگوٹ", "calpol": "کالپول", "capoten": "کیپوٹن", "cardizem": "کارڈیزم",
    "catapres": "کیٹاپریس", "celebrex": "سیلیبریکس", "ceporex": "سیپوریکس", "cetzine": "سیٹزین",
    "cialis": "سیالس", "cipralex": "سپرالیکس", "ciprobid": "سپروبڈ", "ciproxin": "سپروکسن",
    "claforan": "کلافوران", "clarityne": "کلیریٹین", "clexane": "کلیکسین", "concor": "کونکور",
    "controloc": "کنٹرولوک", "cordarone": "کورڈارون", "coumadin": "کومیڈن", "coversyl": "کوورسل",
    "cozaar": "کوزار", "crestor": "کریسٹور", "cyclokapron": "سائیکلوکیپرون", "dalacin": "ڈیلاسن",
    "daonil": "ڈاؤنل", "deanxit": "ڈینکسٹ", "deltacortril": "ڈیلٹاکورٹرل", "diamicron": "ڈایامائیکرون",
    "diapride": "ڈایاپرائیڈ", "diflucan": "ڈفلوکان", "dilantin": "ڈائلینٹن", "diovan": "ڈایووان",
    "disprin": "ڈسپرین", "disprol": "ڈسپرول", "dramamine": "ڈرامامین", "duphalac": "ڈوفالیک",
    "duricef": "ڈیوریسیف", "eliquis": "ایلی کوئس", "eltroxin": "ایلٹروکسن", "epival": "ایپی وال",
    "esidrex": "ایسی ڈریکس", "euglucon": "یوگلوکون", "exforge": "ایکسفورج", "feldene": "فیلڈین",
    "flagyl": "فلیجل", "folvite": "فول وائٹ", "forxiga": "فورکسیگا", "fosamax": "فوسامیکس",
    "fucidin": "فیوسیڈن", "fusidin": "فیوسیڈن", "gabica": "گیبیکا", "galvus": "گیلوس",
    "garamycin": "گیرامائسن", "genticyn": "جینٹی سن", "glucophage": "گلوکوفیج",
    "glucovance": "گلوکووینس", "gravinate": "گریوینیٹ", "herbesser": "ہربیسر",
    "humulin": "ہیومولن", "hyzaar": "ہائیزار", "iberet": "آئبیریٹ", "imdur": "امڈیور",
    "imigran": "امیگران", "imodium": "اموڈیم", "imuran": "امیوران", "inderal": "انڈیرال",
    "ismo": "ازمو", "isokin": "آئسوکن", "isoptin": "آئسوپٹن", "isordil": "آئسورڈل",
    "janumet": "جینومیٹ", "januvia": "جینوویا", "jardiance": "جارڈیئنس", "keflex": "کیفلیکس",
    "klacid": "کلیسڈ", "klaricid": "کلیریسڈ", "lamictal": "لیمکٹال", "lamisil": "لیمیسل",
    "lanoxin": "لینوکسن", "lantus": "لینٹس", "lasix": "لیزکس", "leflox": "لیفلوکس",
    "levemir": "لیویمیر", "lexotanil": "لیکسوٹانل", "lioresal": "لیوریسال", "lipitor": "لپیٹور",
    "lopressor": "لوپریسر", "losec": "لوزیک", "lowplat": "لوپلاٹ", "lyrica": "لیریکا",
    "macrodantin": "میکروڈینٹن", "marevan": "میریوان", "maxolon": "میکسولون", "medrol": "میڈرول",
    "methycobal": "میتھی کوبال", "minipress": "منی پریس", "mixtard": "مکسٹارڈ", "mobic": "موبک",
    "motilium": "موٹیلیم", "myambutol": "مائی ایمبوٹول", "naprosyn": "نیپروسن",
    "natrilix": "نیٹریلکس", "mercazole": "مرکازول", "neurobion": "نیوروبیون",
    "neurontin": "نیورونٹن", "nexium": "نیکسیم", "nexum": "نیکسم", "nitromint": "نائٹرومنٹ",
    "nizoral": "نزورال", "norvasc": "نارویسک", "novidat": "نوویڈیٹ", "novorapid": "نووریپڈ",
    "nuberol": "نیوبیرول", "omez": "اومیز", "onset": "آن سیٹ", "orbenin": "اوربینن",
    "oscal": "اوس کال", "panadol": "پیناڈول", "penbritin": "پین بریٹن", "penegra": "پینیگرا",
    "persantin": "پرسینٹن", "petril": "پیٹرل", "phenergan": "فینرگن", "piriton": "پیریٹون",
    "placida": "پلیسیڈا", "plavix": "پلاویکس",
    "ponstan": "پونسٹان", "pradaxa": "پراڈیکسا", "primperan": "پرمپیران", "proscar": "پروسکار",
    "prothiaden": "پروتھایاڈن", "prozac": "پروزیک", "pyzina": "پائزینا", "qalsan": "کالسان",
    "rabecid": "ریبیسڈ", "razo": "ریزو", "renitec": "رینیٹیک", "rifadin": "رفاڈن", "rigix": "رجکس",
    "rimactal": "رمیکٹال", "risek": "رائزک", "risperdal": "رسپرڈال", "rivotril": "ریووٹرل",
    "rocephin": "روسیفن", "rusyde": "رسائیڈ", "septran": "سیپٹران", "seretide": "سیریٹائیڈ",
    "seroquel": "سیروکوئل", "sibelium": "سبیلیم", "singulair": "سنگولیئر", "sirdalud": "سرڈالڈ",
    "spiriva": "سپیریوا", "sporanox": "سپورانوکس", "stemetil": "سٹیمیٹل", "stugeron": "سٹوجیرون",
    "symbicort": "سمبی کورٹ", "tagamet": "ٹیگامیٹ", "tamiflu": "ٹیمی فلو", "tavanic": "ٹیوانک",
    "tegretol": "ٹیگریٹول", "telfast": "ٹیلفاسٹ", "tenormin": "ٹینورمن", "thyronorm": "تھائرونارم",
    "toradol": "ٹوراڈول", "tramal": "ٹرامال", "transamin": "ٹرانسامن", "tritace": "ٹرائیٹیس",
    "tygacil": "ٹائیگاسل", "valium": "ویلیم", "valtrex": "ویلٹریکس", "velosef": "ویلوسیف",
    "ventolin": "وینٹولین", "viagra": "ویاگرا", "vibramycin": "وائبرامائسن", "voltaren": "وولٹیرن",
    "voltral": "وولٹرال", "xanax": "زینیکس", "xarelto": "زیریلٹو", "zestril": "زیسٹرل",
    "zinacef": "زیناسیف", "zinnat": "زینیٹ", "zithromax": "زیتھرومیکس", "zocor": "زوکور",
    "zofran": "زوفران", "zoloft": "زولوفٹ", "zovirax": "زوویریکس", "zyloric": "زائیلورک",
    "zyrtec": "زرٹیک", "zyvox": "زائیووکس", "zycolchin": "زائی کولچن",
    # Salts
    "acetaminophen": "ایسیٹامینوفین", "acyclovir": "ایسائیکلوویر", "albuterol": "ایلبیوٹیرول",
    "alendronate": "ایلینڈرونیٹ", "allopurinol": "ایلوپیورینول", "alprazolam": "ایلپرازولام",
    "amikacin": "امیکاسن", "amiodarone": "امیوڈارون", "amlodipine": "ایملوڈیپین",
    "amoxicillin": "اموکسی سلین", "ampicillin": "ایمپی سلین", "apixaban": "اپکسابان",
    "aspirin": "اسپرین", "aspart": "اسپارٹ", "atenolol": "ایٹینولول",
    "atorvastatin": "ایٹورواسٹیٹن", "azathioprine": "ایزاتھایوپرین",
    "azithromycin": "ایزیتھرومائسن", "baclofen": "بیکلوفین", "bisoprolol": "بسوپرولول",
    "budesonide": "بیوڈیسونائیڈ", "butylbromide": "بیوٹائل برومائیڈ", "caffeine": "کیفین",
    "captopril": "کیپٹوپرل", "carbamazepine": "کاربامازیپین", "carbimazole": "کاربیمازول",
    "carvedilol": "کارویڈیلول", "cefixime": "سیفکزیم", "cefotaxime": "سیفوٹیکزیم",
    "ceftazidime": "سیفٹازیڈیم", "ceftriaxone": "سیفٹرائیکسون", "cefuroxime": "سیفیوروکزیم",
    "celecoxib": "سیلیکوکسب", "cephalexin": "سیفالیکسن", "cephradine": "سیفراڈین",
    "cetirizine": "سیٹریزین", "chlorpheniramine": "کلورفینیرامین",
    "cholecalciferol": "کولی کیلسیفیرول", "cimetidine": "سیمیٹیڈین", "cinnarizine": "سناریزین",
    "ciprofloxacin": "سپروفلوکساسن", "clarithromycin": "کلیریتھرومائسن",
    "clavulanate": "کلیوولینیٹ", "clindamycin": "کلنڈامائسن", "clonazepam": "کلونازیپام",
    "clonidine": "کلونیڈین", "clopidogrel": "کلوپیڈوگرل", "cloxacillin": "کلوکساسلین",
    "codeine": "کوڈین", "colchicine": "کولچیسین", "colistimethate": "کولسٹی میتھیٹ",
    "cyanocobalamin": "سائنوکوبالامن", "dabigatran": "ڈیبیگیٹران",
    "dapagliflozin": "ڈیپاگلیفلوزن", "detemir": "ڈیٹیمیر", "diazepam": "ڈایازیپام",
    "diclofenac": "ڈائیکلوفینک", "digoxin": "ڈیجوکسن", "diloxanide": "ڈائیلوکسانائیڈ",
    "diltiazem": "ڈلٹیازم", "dimenhydrinate": "ڈائیمین ہائیڈرینیٹ",
    "dinitrate": "ڈائی نائٹریٹ", "dipyridamole": "ڈائی پیریڈامول", "divalproex": "ڈائی ویلپرویکس",
    "domperidone": "ڈومپیریڈون", "dosulepin": "ڈوسولیپن", "doxazosin": "ڈوکسازوسن",
    "doxycycline": "ڈوکسی سائیکلین", "dutasteride": "ڈیوٹاسٹیرائیڈ",
    "empagliflozin": "ایمپاگلیفلوزن", "enalapril": "اینالاپرل", "enoxaparin": "اینوکساپیرن",
    "ergotamine": "ارگوٹامین", "erythromycin": "اریتھرومائسن",
    "escitalopram": "ایسیٹالوپرام", "esomeprazole": "ایسومیپرازول", "ethambutol": "ایتھمبیوٹول",
    "fexofenadine": "فیکسوفیناڈین", "finasteride": "فیناسٹیرائیڈ", "fluconazole": "فلوکونازول",
    "flunarizine": "فلوناریزین", "fluoxetine": "فلوکسیٹین", "flupentixol": "فلوپینٹکسول", "fluticasone": "فلوٹیکاسون",
    "formoterol": "فارموٹیرول", "fosfomycin": "فوسفومائسن", "furosemide": "فیوروسیمائیڈ",
    "gabapentin": "گاباپینٹن", "gemfibrozil": "جیمفائبروزل", "gentamicin": "جینٹامائسن",
    "glargine": "گلارجین", "gliclazide": "گلیکلازائیڈ", "glimepiride": "گلیمیپرائیڈ",
    "glyburide": "گلائبیورائیڈ", "hydrochlorothiazide": "ہائیڈروکلوروتھایازائیڈ",
    "hyoscine": "ہائیوسین", "ibuprofen": "آئبوپروفین", "indapamide": "انڈاپامائیڈ",
    "ipratropium": "اپراٹروپیم", "isoniazid": "آئسونایازڈ", "isosorbide": "آئسوسوربائیڈ",
    "itraconazole": "اٹراکونازول", "ketoconazole": "کیٹوکونازول", "ketorolac": "کیٹورولیک",
    "lactulose": "لیکٹولوز", "lamotrigine": "لیموٹریجین", "levofloxacin": "لیووفلوکساسن",
    "levothyroxine": "لیووتھائروکسین", "linezolid": "لائنزولڈ", "lisinopril": "لیسینوپرل",
    "loperamide": "لوپیرامائیڈ", "loratadine": "لوراٹاڈین", "losartan": "لوسارٹن",
    "mebendazole": "میبینڈازول", "mecobalamin": "میکوبالامن", "melitracen": "میلیٹریسن", "meloxicam": "میلوکسی کیم",
    "meropenem": "میروپینم", "metformin": "میٹفارمن", "methotrexate": "میتھوٹریکسیٹ",
    "methyldopa": "میتھائل ڈوپا", "methylprednisolone": "میتھائل پریڈنیسولون",
    "metoclopramide": "میٹوکلوپرامائیڈ", "metoprolol": "میٹوپرولول",
    "metronidazole": "میٹرونیڈازول", "mononitrate": "مونونائٹریٹ", "montelukast": "مونٹیلوکاسٹ",
    "morphine": "مارفین", "moxifloxacin": "موکسی فلوکساسن", "naproxen": "نیپروکسن",
    "nifedipine": "نفیڈیپین", "nitrofurantoin": "نائٹروفیورینٹوئن",
    "nitroglycerin": "نائٹروگلیسرین", "ofloxacin": "اوفلوکساسن", "omeprazole": "اومیپرازول",
    "ondansetron": "اونڈینسیٹرون", "orphenadrine": "آرفیناڈرین", "oseltamivir": "اوسلٹامیویر",
    "pantoprazole": "پینٹوپرازول", "perindopril": "پیرنڈوپرل", "pheniramine": "فینیرامین",
    "phenobarbital": "فینوباربیٹال", "phenytoin": "فینیٹوئن", "piperacillin": "پائپراسلین",
    "piroxicam": "پائروکسی کیم", "prazosin": "پرازوسن", "prednisolone": "پریڈنیسولون",
    "pregabalin": "پریگابالن", "prochlorperazine": "پروکلورپیرازین",
    "promethazine": "پرومیتھازین", "propranolol": "پروپرانولول",
    "pseudoephedrine": "سوڈوایفیڈرین", "pyrazinamide": "پائرازینامائیڈ",
    "pyridoxine": "پائریڈوکسین", "quetiapine": "کوئٹایاپین", "rabeprazole": "ریبیپرازول",
    "ramipril": "ریمیپرل", "rifampin": "رفامپن", "risperidone": "رسپیریڈون",
    "rivaroxaban": "ریواروکسابان", "rosuvastatin": "روسوواسٹیٹن", "salmeterol": "سالمیٹیرول",
    "sertraline": "سرٹرالین", "sildenafil": "سلڈینافل", "simvastatin": "سمواسٹیٹن",
    "sitagliptin": "سیٹاگلپٹن", "spironolactone": "سپائرونولیکٹون",
    "sulfamethoxazole": "سلفامیتھوکسازول", "sumatriptan": "سوماٹرپٹن", "tadalafil": "ٹاڈالافل",
    "tamsulosin": "ٹیمسولوسن", "tazobactam": "ٹازوبیکٹم", "terbinafine": "ٹربینافین",
    "theophylline": "تھیوفائلین", "thiamine": "تھایامین", "tigecycline": "ٹائیگی سائیکلین",
    "tiotropium": "ٹائیوٹروپیم", "tizanidine": "ٹیزانیڈین", "tobramycin": "ٹوبرامائسن",
    "tramadol": "ٹراماڈول", "trimethoprim": "ٹرائی میتھوپرم", "valacyclovir": "ویلاسائیکلوویر",
    "valsartan": "والسارٹن", "vancomycin": "وینکومائسن", "verapamil": "ویراپامل",
    "vildagliptin": "ولڈاگلپٹن", "warfarin": "وارفرین", "zolpidem": "زولپیڈم",
}

_VOWELS = "aeiouy"

# Longest match first. A leading "^" or trailing "$" pins the rule to the
# start or end of the word.
_RULES: tuple[tuple[str, str], ...] = (
    ("mycin", "مائسن"), ("cillin", "سلین"), ("floxacin", "فلوکساسن"), ("statin", "سٹیٹن"),
    ("prazole", "پرازول"), ("azole", "ازول"), ("cycline", "سائیکلین"), ("^cef", "سیف"),
    ("^ceph", "سیف"), ("^hydro", "ہائیڈرو"), ("^nitro", "نائٹرو"), ("^cyclo", "سائیکلو"),
    ("^chlor", "کلور"), ("chl", "کل"), ("chr", "کر"),
    ("ine$", "ین"), ("ide$", "ائیڈ"), ("ate$", "یٹ"), ("ole$", "ول"), ("one$", "ون"),
    ("ase$", "یز"), ("ose$", "وز"), ("ime$", "یم"), ("age$", "یج"), ("ene$", "ین"),
    ("ane$", "ین"), ("yne$", "ین"), ("ace$", "یس"), ("ex$", "یکس"), ("ox$", "وکس"),
    ("ix$", "کس"), ("ax$", "یکس"), ("ium$", "یم"), ("^x", "ز"), ("^au", "آ"), ("^ae", "ای"),
    ("ph", "ف"), ("th", "تھ"), ("sh", "ش"), ("ch", "چ"), ("ck", "ک"), ("gh", "گ"),
    ("qu", "کو"), ("sce", "سی"), ("sci", "سی"),
    ("ee", "ی"), ("oo", "و"), ("ea", "ی"), ("ai", "ی"), ("au", "ا"), ("ou", "و"),
    ("ie", "ی"), ("ei", "ی"), ("oi", "وئی"), ("io", "یو"), ("ia", "یا"), ("eo", "یو"),
    ("ue", "و"), ("ua", "وا"), ("oa", "و"), ("eu", "یو"), ("ui", "وی"),
)
_CONSONANTS = {
    "b": "ب", "d": "ڈ", "f": "ف", "h": "ہ", "j": "ج", "k": "ک", "l": "ل", "m": "م",
    "n": "ن", "p": "پ", "q": "ک", "r": "ر", "s": "س", "t": "ٹ", "v": "و", "w": "و",
    "x": "کس", "z": "ز",
}
_INITIAL_VOWELS = {"a": "ا", "e": "ای", "i": "ا", "o": "او", "u": "ا", "y": "ی"}
_MEDIAL_VOWELS = {"a": "ا", "e": "ی", "i": "ی", "o": "و", "u": "و", "y": "ی"}

_TOKEN = re.compile(r"[A-Za-z]+")
_LATIN = re.compile(r"[A-Za-z]")


def _spell_by_rule(word: str) -> str:
    out: list[str] = []
    index = 0
    length = len(word)
    while index < length:
        for pattern, urdu in _RULES:
            bare = pattern.strip("^$")
            if pattern.startswith("^") and index != 0:
                continue
            if pattern.endswith("$") and index + len(bare) != length:
                continue
            if word.startswith(bare, index):
                out.append(urdu)
                index += len(bare)
                break
        else:
            char = word[index]
            following = word[index + 1] if index + 1 < length else ""
            if index and char == word[index - 1] and char not in _VOWELS:
                pass  # doubled consonant is written once
            elif char == "c":
                out.append("س" if following in ("e", "i", "y") and following else "ک")
            elif char == "g":
                out.append("ج" if following in ("e", "i", "y") and following else "گ")
            elif char in _CONSONANTS:
                out.append(_CONSONANTS[char])
            elif index == 0:
                out.append(_INITIAL_VOWELS[char])
            elif char == "e" and index == length - 1:
                pass  # silent final e
            else:
                out.append(_MEDIAL_VOWELS[char])
            index += 1
    return "".join(out)


def _spell_word(word: str) -> str:
    lower = word.lower()
    if lower in WORDS:
        return WORDS[lower]
    # "M", "XR", "DS", "BD": dose-form letters are read out one by one.
    if len(word) <= 3 and word.isupper() or len(word) == 1:
        return " ".join(LETTER_NAMES[char] for char in lower)
    return _spell_by_rule(lower)


def name_to_urdu(name: str) -> str:
    """Spell every Latin word in ``name`` in Urdu script. Digits are kept."""
    spelt = _TOKEN.sub(lambda match: _spell_word(match.group()), name)
    return " ".join(spelt.replace("-", " ").split())


def has_latin(text: str) -> bool:
    return bool(_LATIN.search(text))
