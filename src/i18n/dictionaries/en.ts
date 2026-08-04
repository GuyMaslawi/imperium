/**
 * Hebrew → English.
 *
 * Keys are the Hebrew source text exactly as it appears at the call site — see
 * the long note in `src/i18n/translate.ts` for why. Two rules follow from that
 * and both matter:
 *
 *  - **Copy the key, never retype it.** A key that differs from the source by
 *    one character (a straight quote for a curly one, a missing נקודה, a
 *    non-breaking space) is simply never found, and the string silently stays
 *    Hebrew. If a string looks untranslated on screen, suspect the key first.
 *  - **`{placeholders}` must survive.** They are filled at render time, so an
 *    English value that drops one loses the number it was carrying. Word order
 *    around them is free — that is the whole point of having them.
 *
 * A missing key is not an error: the source Hebrew renders instead. That is
 * what lets this file be filled in screen by screen without ever shipping a
 * broken page.
 *
 * Sections below follow the player's path through the game, not the file tree,
 * so a translator can work top to bottom.
 */
export const EN: Record<string, string> = {
  /* ------------------------------------------------------------------ */
  /* brand + shared chrome                                              */
  /* ------------------------------------------------------------------ */
  "קראלדור | Kraldor": "Kraldor",
  "בנה אימפריה. צור ברית. כבוש את הדירוג.":
    "Build an empire. Forge an alliance. Conquer the ladder.",

  /* resources — the six balances in the command bar */
  "זהב": "Gold",
  "עץ": "Wood",
  "ברזל": "Iron",
  "אבן": "Stone",
  "יהלומים": "Diamonds",
  "אזרחים": "Citizens",
  "תורות": "Turns",

  /* navigation */
  "בסיס": "Base",
  "גיבור": "Hero",
  "דירוג": "Rankings",
  "מפעל": "Armory",
  "ניהול": "Army",
  "מכונות": "Mines",
  "ברית": "Guild",
  "מלחמת בריתות": "Guild War",
  "בנק": "Bank",
  "מחסנים": "Storage",
  "הישגים": "Achievements",
  "שדרוגים": "Upgrades",
  "מדריך": "Guide",
  "קהילה": "Community",
  "היסטוריה": "History",
  "הודעות": "Messages",
  "פרסים": "Prizes",
  "תגמולים": "Rewards",
  "הגדרות": "Settings",
  "התנתקות": "Log out",
  "פתיחת תפריט": "Open menu",
  "סגירת תפריט": "Close menu",
  "ברוך שובך,": "Welcome back,",
  "חי": "LIVE",

  /* the hero card in the sidebar */
  "חיים": "Health",
  "ניסיון": "XP",
  "מקצוע הגיבור": "Hero class",
  "רמת הגיבור — עולה מניסיון שנצבר בקרבות":
    "Hero level — rises with the experience earned in battle",
  "חיי הגיבור — כל תקיפה שפורצת את ההגנה שלך מורידה מהם":
    "Your hero's health — every attack that breaks your defence takes a bite out of it",
  "ניסיון הגיבור — נצבר מקרבות: ניצחון בתקיפה מעניק הכי הרבה, גם הגנה מוצלחת מזכה. במלוא הבר הגיבור עולה רמה":
    "Hero experience — earned in battle: a won attack pays the most, a successful defence also counts. A full bar is a level.",
  "💀 הגיבור מת": "💀 Your hero is dead",
  "הגיבור נפל בקרב — כל נקודותיו והבונוסים שלו מושבתים עד שיקום לתחייה. לחץ לפרטים.":
    "Your hero has fallen — every point and bonus he carries is switched off until he is raised. Tap for details.",
  "נקודות גיבור פנויות — הקצה אותן בעמוד הגיבור (כל נקודה = +1%)":
    "Unspent hero points — allocate them on the hero screen (each point is +1%)",
  "{points} נקודות פנויות": "{points} points to spend",
  "תג איפוס: הגיבור הגיע לרמה 100 ואופס פעם אחת":
    "Prestige badge: your hero reached level 100 and was reset once",
  "תג איפוס: הגיבור הגיע לרמה 100 ואופס {count} פעמים":
    "Prestige badge: your hero reached level 100 and was reset {count} times",

  /* command-bar pills */
  "היסטוריית קרבות וריגול — תקיפות עליי, תקיפות שלי, ריגול עליי וריגול שלי. ההתראה נדלקת רק כשתוקפים או מרגלים עליי":
    "Battle and spy history — attacks on me, my attacks, spies on me and my missions. The alert only lights up when someone attacks or spies on me.",
  "תיבת הדואר: הודעות משחקנים, התראות על התקפות, מרגלים שנתפסו ועדכוני מערכת":
    "Your inbox: player mail, attack alerts, spies you caught and system notices",
  "פרסי העונה — יהלומים לשלושת הראשונים בסיום העונה, והדירוג החי שקובע מי יושב על כל מדרגה":
    "Season prizes — diamonds for the top three when the season ends, and the live ladder deciding who stands on each step",
  "יש לך הישגים שהושלמו וממתינים לאיסוף — היכנס ואסוף את התגמולים":
    "You have completed achievements waiting to be collected — go in and claim them",
  "{label} — {count} חדשים": "{label} — {count} new",

  /* ------------------------------------------------------------------ */
  /* the way in — auth shell, login, Google                             */
  /* ------------------------------------------------------------------ */
  // Two call sites share this word: the wordmark's subtitle under the crest,
  // and the tenth city — the seat of the broken crown. One value has to serve
  // both (the source text IS the key, see translate.ts), and it is the city
  // that appears constantly, so the city's reading wins. Under the crest it
  // reads as the lockup repeating its own name, which is what a lockup does.
  "קראלדור": "Kraldor",
  "התחברות | קראלדור": "Sign in | Kraldor",
  "התחברות": "Sign in",
  "אימייל": "Email",
  "סיסמה": "Password",
  "מתחבר...": "Signing in…",
  "התחבר למשחק": "Enter the game",
  "עדיין אין לך אימפריה?": "No empire yet?",
  "הירשם עכשיו": "Create one",
  "או": "or",
  "מתחבר עם Google...": "Signing in with Google…",
  "התחברות Google נכשלה, נסה שוב": "Google sign-in failed — please try again",
  "הצטרפו לקהילה בדיסקורד": "Join the community on Discord",
  "תנאי שימוש": "Terms of Service",
  "ביטולים והחזרים": "Cancellations & Refunds",
  "פרטיות": "Privacy",
  "כל הזכויות שמורות": "All rights reserved",
  "{season} הסתיימה": "{season} has ended",
  "המשחק סגור עד פתיחת העונה הבאה.":
    "The game is closed until the next season opens.",
  "לתוצאות העונה ולספירה לאחור →":
    "Season results and the countdown →",

  /* ------------------------------------------------------------------ */
  /* the armory (weapons)                                               */
  /* ------------------------------------------------------------------ */
  "רמה": "Tier",
  "ברשותך:": "You own:",
  "עוצמה ליחידה:": "Power per unit:",
  "קנה": "Buy",
  "קונה...": "Buying…",
  "הכל": "Max",
  "כמות לא תקינה": "That quantity is not valid",
  "נשק לא מוכר": "Unknown weapon",
  "אין מספיק משאבים זמינים לקנייה.": "You do not have enough available resources.",
  "אין מספיק מהמשאב הזה ליחידה אחת":
    "Not enough of this resource for even one unit",
  "קסם הנחה פעיל": "Discount spell active",
  "הנשק נעול — פתח נשק מתקדם כדי לקנות אותו":
    "This weapon is locked — unlock the next tier to buy it",
  "נקנו {count} {weapon} בהצלחה!": "Bought {count} {weapon}.",
  "לא ניתן להחזיק יותר מ-{max} יחידות מאותו נשק — יש לך כבר {owned}":
    "You cannot hold more than {max} of one weapon — you already have {owned}",

  /* ------------------------------------------------------------------ */
  /* the barracks (training)                                            */
  /* ------------------------------------------------------------------ */
  "עלות:": "Cost:",
  "אזרח אחד": "one citizen",
  "ביצוע אימון": "Train",
  "מאמן...": "Training…",
  "עוצמה": "power",
  "כמות לאימון (אזרחים פנויים: {available})":
    "How many to train (citizens free: {available})",
  "נדרש מרכז מודיעין כדי להכשיר מרגלים":
    "You need an intelligence centre to train spies",
  "אין מספיק אזרחים פנויים לאימון": "You do not have enough free citizens",
  "אומנו {count} {unit} בהצלחה!": "Trained {count} {unit}.",
  "לא ניתן להחזיק יותר מ-{max} {unit} — יש לך כבר {owned}":
    "You cannot hold more than {max} {unit} — you already have {owned}",

  /* ------------------------------------------------------------------ */
  /* generic action outcomes                                            */
  /* ------------------------------------------------------------------ */
  "אירעה שגיאה, נסה שוב": "Something went wrong — please try again",
  "לא מחובר": "Not signed in",
  "העונה הסתיימה — המשחק סגור עד פתיחת העונה הבאה":
    "The season is over — the game is closed until the next one opens",
  "סוג משאב לא תקין": "That is not a valid resource",
  "סוג מחסן לא תקין": "That is not a valid warehouse",
  "סוג שדרוג לא תקין": "That is not a valid upgrade",
  "יעד לא תקין": "That is not a valid target",
  " ו-": " and ",

  /* ------------------------------------------------------------------ */
  /* the armory screen                                                  */
  /* ------------------------------------------------------------------ */
  "נשקים | קראלדור": "Weapons | Kraldor",
  "חנות נשקים": "Weapon Shop",
  "התקפה": "Attack",
  "הגנה": "Defence",
  "ריגול": "Espionage",
  "כוח התקפה מנשקים": "Attack power from weapons",
  "כוח הגנה מנשקים": "Defence power from weapons",
  "כוח ריגול מנשקים": "Espionage power from weapons",
  "כוח התקפה כולל מנשקים": "Total attack power from weapons",
  "כוח הגנה כולל מנשקים": "Total defence power from weapons",
  "כוח ריגול כולל מנשקים": "Total espionage power from weapons",
  "קסם הנחה פעיל!": "Discount spell active!",
  "כל הנשקים והפתיחות ב־{pct}% הנחה כל עוד הקסם פעיל.":
    "Every weapon and unlock is {pct}% off for as long as the spell holds.",
  "🎉 המפעל במקסימום! כל הנשקים פתוחים.":
    "🎉 The armory is maxed out — every weapon is unlocked.",
  "נפחיית {label} — {powerLabel}: {power}, שכבה {tier} מתוך {maxTier}":
    "{label} forge — {powerLabel}: {power}, tier {tier} of {maxTier}",
  "← הנשק הבא": "NEXT WEAPON →",
  "🔒 נעול": "🔒 Locked",
  "עלות ליחידה:": "Cost per unit:",
  "עלות פתיחה:": "Unlock cost:",
  "דרישות לרמה הבאה:": "Requirements for the next tier:",
  "🏰 עיר {required} (אתה בעיר {current})":
    "🏰 City {required} (you are on city {current})",
  "⚔️ גיבור רמה {required} (רמה {current})":
    "⚔️ Hero level {required} (you are level {current})",
  "פתיחה מקדמת את הנשק הבא בכל הקטגוריות — התקפה, הגנה וריגול.":
    "Unlocking advances the next weapon in all three categories — attack, defence and espionage.",
  "אין מספיק מהמשאב הזה לפתיחה":
    "Not enough of this resource for the unlock",
  "פותח...": "Unlocking…",
  "🔓 פתח נשק הבא": "🔓 Unlock next weapon",
  "🔒 דרישות לא הושלמו": "🔒 Requirements not met",
  "אין מספיק משאבים לפתיחת הנשק הבא":
    "You do not have enough resources to unlock the next weapon",
  "כל הנשקים פתוחים.": "Every weapon is already unlocked.",
  "כדי לפתוח רמה {tier} צריך {needs}.":
    "Unlocking tier {tier} needs {needs}.",
  "{required} ערים (יש לך {current})": "{required} cities (you have {current})",
  "גיבור ברמה {required} (הגיבור שלך ברמה {current})":
    "a level {required} hero (yours is level {current})",
  "נפתחה רמה {tier} לכל הנשקים — התקפה, הגנה וריגול!":
    "Tier {tier} unlocked across attack, defence and espionage!",

  /* ------------------------------------------------------------------ */
  /* resources, buildings, units, upgrades — the game's data labels      */
  /* ------------------------------------------------------------------ */
  "מכרה זהב": "Gold Mine",
  "מכרה עץ": "Lumber Camp",
  "מכרה ברזל": "Iron Mine",
  "מחצבת אבן": "Stone Quarry",
  "מחנה אימונים": "Training Camp",
  "מרכז מודיעין": "Intelligence Centre",
  "מחסן זהב": "Gold Warehouse",
  "מחסן עץ": "Lumber Warehouse",
  "מחסן ברזל": "Iron Warehouse",
  "מחסן אבן": "Stone Warehouse",
  "חייל": "Soldier",
  "חיילים": "soldiers",
  "מרגל": "Spy",
  "מרגלים": "spies",
  "עבד מכרות": "Mine Slave",
  "עבדי מכרות": "mine slaves",
  "קבלת אזרחים": "Citizen Intake",
  "מודיעין": "Intelligence",
  "כמות הפקדות בבנק": "Bank Deposit Limit",
  "ריבית בנק": "Bank Interest",
  "קבלת תורות": "Turn Income",
  "מזל הגלגל": "Wheel Luck",
  "{building} שודרג לרמה {level}!": "{building} upgraded to level {level}!",
  "{storage} שודרג לרמה {level} (קיבולת: {capacity})":
    "{storage} upgraded to level {level} (capacity: {capacity})",
  "{upgrade} שודרג לרמה {level}!": "{upgrade} upgraded to level {level}!",
  "אין מספיק משאבים לשדרוג": "You do not have enough resources for this upgrade",
  "אין מספיק משאבים לשדרוג המחסן":
    "You do not have enough resources to upgrade the warehouse",
  "רמה מקסימלית": "Maximum level",
  "המכרה לא נמצא": "Mine not found",
  "המכרה כבר ברמה המקסימלית": "That mine is already at its maximum level",
  "אין מספיק משאבים זמינים. ניתן למשוך משאבים מהמחסן.":
    "Not enough available resources — you can withdraw some from your warehouse.",

  /* mines & slave assignment */
  "כמות עבדי מכרות לא תקינה": "That mine-slave count is not valid",
  "אין מספיק עבדי מכרות (סה\"כ עבדי מכרות: {total})":
    "You do not have that many mine slaves (you own {total})",
  "אין מספיק עבדי מכרות פנויים (ניתן להציב כאן עד {max})":
    "Not enough idle mine slaves — you can place up to {max} here",
  "הוצבו {count} עבדי מכרות ב{mine}": "Placed {count} mine slaves in the {mine}",
  "כל {total} עבדי המכרות הוצבו ב{resource}":
    "All {total} mine slaves are now working {resource}",
  "עבדי המכרות חולקו שווה בשווה בין ארבעת המשאבים":
    "Your mine slaves are split evenly across all four resources",
  "החלוקה נוקתה — כל עבדי המכרות פנויים":
    "Assignments cleared — every mine slave is idle",

  /* warehouses */
  "המחסן לא נמצא": "Warehouse not found",
  "המחסן ריק": "That warehouse is empty",
  "המחסן מלא — שדרג אותו כדי לאחסן עוד":
    "That warehouse is full — upgrade it to store more",
  "אין משאבים זמינים לאחסון": "You have no available resources to store",
  "אין מספיק משאבים זמינים לאחסון":
    "You do not have enough available resources to store",
  "אין מספיק משאבים במחסן": "There is not that much in the warehouse",
  "אוחסנו {amount} {resource} במחסן": "Stored {amount} {resource}",
  "נמשכו {amount} {resource} מהמחסן": "Withdrew {amount} {resource}",
  "אין מספיק מקום במחסן (מקום פנוי: {free})":
    "Not enough room in the warehouse (free space: {free})",
  "אין מספיק משאבים במחסן (מאוחסן: {stored})":
    "Not enough in the warehouse (stored: {stored})",

  /* cities */
  "הגעת לרמת העיר המרבית ({max}).": "You have reached the highest city ({max}).",
  "נדרש גיבור ברמה {level} כדי לעלות עיר.":
    "Founding the next city needs a level {level} hero.",
  "נדרשים {soldiers} חיילים בצבא כדי לעלות עיר.":
    "Founding the next city needs {soldiers} soldiers in your army.",
  "אין מספיק משאבים כדי לעלות עיר.":
    "You do not have enough resources to found the next city.",
  "עלית לעיר {city}! התפוקה שלך גדלה בהתאם.":
    "You have risen to city {city} — your output grows with it.",

  /* attacking & spying */
  "לא ניתן לתקוף את האימפריה שלך": "You cannot attack your own empire",
  "לא ניתן לרגל אחרי האימפריה שלך": "You cannot spy on your own empire",
  "האימפריה המבוקשת לא נמצאה": "That empire was not found",
  "האימפריה הזו אינה זמינה.": "That empire is not available.",
  "האימפריה הזו מוגנת (שחקן חדש) — לא ניתן לתקוף או לרגל אותה עדיין.":
    "That empire is under new-player protection — it cannot be attacked or spied on yet.",
  "לא ניתן לתקוף אימפריה שאינה בעיר שלך.":
    "You can only attack empires in your own city.",
  "לא ניתן לרגל אחר אימפריה שאינה בעיר שלך.":
    "You can only spy on empires in your own city.",
  "לא ניתן לתקוף חבר לברית — שניכם בברית {guild}.":
    "You cannot attack a guildmate — you are both in {guild}.",
  "אין לך מספיק תורות לביצוע תקיפה.": "You do not have enough turns to attack.",
  "אין לך מספיק תורות לביצוע ריגול.":
    "You do not have enough turns for a spy mission.",
  "אין לך צבא לתקיפה — אמן חיילים קודם":
    "You have no army to attack with — train soldiers first",
  "נדרש לפחות מרגל אחד למשימת ריגול":
    "A spy mission needs at least one spy",
  "כוחות הביטחון שלך תפסו מרגל של {attacker} לפני שהספיק לאסוף מידע.":
    "Your guards caught a spy sent by {attacker} before they gathered anything.",

  /* misc */
  "שם האימפריה נעול למשך העונה ולא ניתן לשינוי.":
    "Your empire's name is locked for the season and cannot be changed.",
  "דיסקורד": "Discord",
  "קהילת קראלדור בדיסקורד — עדכונים, שעות שמחה, מיני-משחקים ושאר השחקנים. נפתח בלשונית חדשה":
    "The Kraldor community on Discord — updates, happy hours, mini-games and the other players. Opens in a new tab.",

  /* ------------------------------------------------------------------ */
  /* weapon names and flavour — attack                                  */
  /* ------------------------------------------------------------------ */
  "חרבות ברזל": "Iron Swords",
  "חרבות בסיסיות ואמינות לחיילי החזית.":
    "Plain, dependable blades for the men holding the line.",
  "קשתות קרב": "War Bows",
  "קשתות ארוכות טווח שפוגעות באויב עוד לפני ההתנגשות.":
    "Long-range bows that bleed the enemy before the lines ever meet.",
  "גרזני מלחמה": "War Axes",
  "גרזנים כבדים ששוברים מגן ועצם כאחד.":
    "Heavy axes that split shield and bone alike.",
  "רמחי פרשים": "Cavalry Lances",
  "רמחים ארוכים להסתערות פרשים מוחצת.":
    "Long lances for a charge nothing on foot survives.",
  "בליסטראות": "Ballistae",
  "מכונות ירי כבדות שמרסקות שורות שלמות של אויבים.":
    "Heavy shooters that tear whole ranks apart at once.",
  "איילי ניגוח": "Battering Rams",
  "קורות ברזל שמפרקות שערים וחומות.":
    "Iron-headed beams that take gates and walls apart.",
  "מנגנוני קטפולט": "Catapults",
  "אבני ענק עפות מעל החומות אל לב האויב.":
    "Boulders arcing over the walls into the enemy's heart.",
  "תותחי מצור": "Siege Cannons",
  "תותחים אדירים שמפילים חומות ומבצרים.":
    "Great guns that bring down walls and fortresses.",
  "רובי אבק שריפה": "Gunpowder Muskets",
  "נשק חם ראשון ששובר את מערכות הקרב הישנות.":
    "The first firearms — and the end of every old battle formation.",
  "להבי אש": "Flameblades",
  "להבים אגדיים עטופי אש — נשק העילית של האימפריה.":
    "Legendary fire-wreathed blades — the empire's finest steel.",
  "מטילי להביור": "Flame Throwers",
  "מכונות שיורות סילוני אש על שדה הקרב.":
    "Machines that wash the battlefield in burning fuel.",
  "תותחי רעם": "Thunder Cannons",
  "תותחים שקולם לבדו מפיל אימה על האויב.":
    "Guns whose sound alone breaks the enemy's nerve.",
  "מרגמות ברק": "Lightning Mortars",
  "פגזים שמתפוצצים בברק כחול על הכוחות.":
    "Shells that burst in blue lightning over massed troops.",
  "רובאי צלפים": "Sharpshooters",
  "יחידת עילית שפוגעת במפקדי האויב מרחוק.":
    "An elite unit that takes enemy commanders from a distance.",
  "מכונות ירי מהיר": "Rapid-Fire Guns",
  "מטר כדורים בלתי פוסק שמכסה את כל החזית.":
    "An unbroken hail of fire covering the whole front.",
  "טנקי פלדה": "Steel Tanks",
  "מפלצות משוריינות שדורסות כל התנגדות.":
    "Armoured monsters that roll over any resistance.",
  "תותחי ענק": "Giant Cannons",
  "לוע ברזל שמוחק ביצורים בפגז אחד.":
    "An iron muzzle that erases fortifications in one shell.",
  "משגרי טילים": "Missile Launchers",
  "טילים מונחים שרודפים את האויב עד חיסולו.":
    "Guided missiles that chase the enemy until nothing is left.",
  "מפציצי אש": "Firebombers",
  "מכונות מעופפות שממטירות אש מהשמיים.":
    "Flying machines that rain fire from above.",
  "קרני לייזר": "Laser Beams",
  "אלומות אנרגיה שחותכות שריון כמו חמאה.":
    "Energy beams that cut armour like butter.",
  "תותחי פלזמה": "Plasma Cannons",
  "כדורי פלזמה בוערים ששורפים כל דבר בדרכם.":
    "Burning plasma bolts that consume everything in their path.",
  "רובי חלקיקים": "Particle Rifles",
  "נשק שמפרק את האויב לרמת האטום.":
    "Weapons that take the enemy apart atom by atom.",
  "משגרי אלקטרומגנט": "Railguns",
  "פגזים במהירות על-קולית שמנקבים כל מבצר.":
    "Hypersonic slugs that punch through any fortress.",
  "רחפני נחיל": "Swarm Drones",
  "נחיל מכונות זעירות שתוקף מכל כיוון בו-זמנית.":
    "A cloud of tiny machines striking from every direction at once.",
  "תותחי חורבן": "Devastator Cannons",
  "נשק כבד שמשאיר מכתשים בשדה הקרב.":
    "Heavy guns that leave craters where the battlefield was.",
  "מחוללי הדף": "Shockwave Generators",
  "גלי הלם שמוחקים גדודים שלמים בבת אחת.":
    "Shock waves that erase entire battalions in a breath.",
  "להבי אנרגיה טהורה": "Pure Energy Blades",
  "חרבות אור שחותכות דרך כל הגנה.":
    "Blades of light that cut through any defence.",
  "תותחי סינגולריות": "Singularity Cannons",
  "נשק שיוצר חור שחור זעיר בלב האויב.":
    "Weapons that open a pinhole black hole in the enemy's heart.",
  "משמידי ממדים": "Dimension Breakers",
  "נשק שמוחק את האויב מהמציאות עצמה.":
    "Weapons that erase the enemy from reality itself.",
  "יד קראלדור": "The Hand of Kraldor",
  "הנשק האולטימטיבי — כוח שאין לו אח ורע ביקום.":
    "The ultimate weapon — nothing in the universe stands beside it.",

  /* ------------------------------------------------------------------ */
  /* weapon names and flavour — defence                                 */
  /* ------------------------------------------------------------------ */
  "מגני עץ": "Wooden Shields",
  "מגנים פשוטים שבולמים את המכות הראשונות.":
    "Simple shields that soak up the opening blows.",
  "שריון ברזל": "Iron Armour",
  "שריון כבד שמגן על החיילים בקרב פנים אל פנים.":
    "Heavy plate for soldiers who fight face to face.",
  "קסדות פלדה": "Steel Helms",
  "קסדות שמגנות על הלוחמים מפגיעות ראש.":
    "Helms that keep a blow to the head from ending a soldier.",
  "שריון קשקשים": "Scale Armour",
  "שריון גמיש שסופג מכות ומאפשר תנועה חופשית.":
    "Flexible mail that absorbs a strike without binding the wearer.",
  "חומות חניתות": "Spear Walls",
  "שורות חניתות דחוסות שעוצרות כל הסתערות.":
    "Dense ranks of spears that stop any charge dead.",
  "תעלות הגנה": "Defensive Trenches",
  "תעלות עמוקות שמאטות את הסתערות האויב.":
    "Deep cuts in the ground that break the enemy's momentum.",
  "סוללות עפר": "Earthworks",
  "סוללות מבוצרות שמגנות על המחנה.":
    "Fortified banks thrown up around the camp.",
  "מגדלי שמירה": "Watchtowers",
  "מגדלים מבוצרים שיורים באויב מלמעלה.":
    "Fortified towers that fire down on the enemy.",
  "חומות אבן": "Stone Walls",
  "חומות עבות שעומדות בפני כל מצור.":
    "Thick walls that outlast any siege.",
  "חומת קראלדור": "The Wall of Kraldor",
  "החומה האיתנה שסביבה נבנתה הממלכה.":
    "The unshaken wall the kingdom was built around.",
  "שערי ברזל": "Iron Gates",
  "שערים כבדים שאף איל ניגוח לא שובר.":
    "Gates so heavy no ram has ever broken one.",
  "מבצרי פלדה": "Steel Fortresses",
  "מצודות ממתכת שאין דרך לחדור אליהן.":
    "Metal citadels with no way in.",
  "מגיני מצור": "Siege Shields",
  "מערך הגנה שסופג פגזי קטפולט ותותח.":
    "A screen built to swallow catapult stones and cannon shot.",
  "שריון מרוכב": "Composite Armour",
  "שכבות מתכת מרובות שסופגות כל פגיעה.":
    "Layer upon layer of metal, each one drinking the impact.",
  "כיפת מגן": "Shield Dome",
  "מערך שמיירט קליעים לפני שהם פוגעים.":
    "A screen that intercepts incoming fire before it lands.",
  "בונקרים מבוצרים": "Reinforced Bunkers",
  "מקלטים תת-קרקעיים שאי אפשר לפצח.":
    "Underground shelters nothing has ever cracked.",
  "חומות ריאקטיביות": "Reactive Armour",
  "שריון שמתפוצץ החוצה ומנטרל פגזים.":
    "Armour that detonates outward and kills the shell first.",
  "מגני אנרגיה": "Energy Shields",
  "שדות כוח שבולמים את אש האויב.":
    "Force fields that halt the enemy's fire in the air.",
  "כיפת ברזל": "Iron Dome",
  "מערך יירוט שמפיל כל טיל באוויר.":
    "An interception grid that takes every missile down in flight.",
  "מגן פלזמה": "Plasma Shield",
  "קיר פלזמה בוער ששורף כל מתקרב.":
    "A burning plasma wall that consumes anything that approaches.",
  "שדות כוח": "Force Fields",
  "מחסום אנרגיה בלתי חדיר סביב המבצר.":
    "An impenetrable energy barrier around the fortress.",
  "שריון ננו": "Nano Armour",
  "שריון שמתקן את עצמו תוך שניות.":
    "Armour that repairs itself in seconds.",
  "מגני עקיפה": "Deflector Shields",
  "טכנולוגיה שמסיטה קליעים מהמסלול.":
    "Technology that pushes incoming rounds off course.",
  "מבצר מרחף": "Floating Fortress",
  "מצודה מעופפת שאי אפשר להגיע אליה.":
    "A citadel in the air that nothing can reach.",
  "חומות קוונטיות": "Quantum Walls",
  "הגנה שקיימת בכמה ממדים בו-זמנית.":
    "A defence that exists in several dimensions at once.",
  "מגן סינגולריות": "Singularity Shield",
  "שדה שבולע כל התקפה לתוך עצמו.":
    "A field that swallows every attack into itself.",
  "שריון על-ממדי": "Hyperdimensional Armour",
  "הגנה שהאויב פשוט לא מסוגל לגעת בה.":
    "A defence the enemy simply cannot touch.",
  "כיפת נצח": "Eternal Dome",
  "מגן שלא נפרץ מעולם בכל ההיסטוריה.":
    "A shield never breached in all of recorded history.",
  "חומת המציאות": "The Reality Wall",
  "מחסום ששובר את חוקי הפיזיקה עצמם.":
    "A barrier that breaks the laws of physics themselves.",
  "מבצר קראלדור": "The Fortress of Kraldor",
  "ההגנה האולטימטיבית — בלתי חדירה לחלוטין.":
    "The ultimate defence — utterly impenetrable.",

  /* ------------------------------------------------------------------ */
  /* weapon names and flavour — espionage                               */
  /* ------------------------------------------------------------------ */
  "גלימות הסוואה": "Camouflage Cloaks",
  "גלימות שמסתירות את המרגלים מעיני השומרים.":
    "Cloaks that hide your spies from the guards' eyes.",
  "סכיני צללים": "Shadow Knives",
  "סכינים שקטים למשימות חשאיות במיוחד.":
    "Silent blades for the quietest work.",
  "כלי פריצה": "Lockpicks",
  "ערכות לפתיחת מנעולים ושערים סמויים.":
    "Kits for every lock and hidden gate.",
  "תחפושות סוחרים": "Merchant Disguises",
  "מסווה שמאפשר להיכנס לכל עיר בלי חשד.":
    "A cover that walks into any city unquestioned.",
  "עורבי מודיעין": "Messenger Ravens",
  "עורבים מאולפים שמעבירים מסרים מעבר לקווי האויב.":
    "Trained ravens carrying word across enemy lines.",
  "רשת מודיעים": "Informant Network",
  "עיניים ואוזניים בכל פונדק ושוק.":
    "Eyes and ears in every tavern and market.",
  "סמים מרדימים": "Sleeping Draughts",
  "שיקויים שמפילים שומרים בשקט.":
    "Potions that put a guard down without a sound.",
  "אבקת היעלמות": "Vanishing Powder",
  "אבקה שמעלימה את המרגל בענן עשן.":
    "Powder that takes the spy away in a cloud of smoke.",
  "מפות סתר": "Secret Maps",
  "מפות מדויקות של כל ביצורי האויב.":
    "Exact drawings of every enemy fortification.",
  "טבעות התחזות": "Rings of Guise",
  "טבעות קסומות שמאפשרות למרגל להתחזות לכל אדם.":
    "Enchanted rings that let a spy wear any face.",
  "יוני דואר": "Carrier Pigeons",
  "מסרים מוצפנים שעפים מעל קווי האויב.":
    "Ciphered messages flying straight over the enemy's lines.",
  "משקפות ליל": "Night Glasses",
  "עדשות שרואות בחשכה מוחלטת.":
    "Lenses that see in complete darkness.",
  "מכשירי האזנה": "Listening Devices",
  "מכשירים שקולטים כל לחישה בארמון.":
    "Devices that catch every whisper in the palace.",
  "סוכני עומק": "Deep-Cover Agents",
  "מרגלים ששתולים שנים בלב האויב.":
    "Spies planted years ago in the enemy's own house.",
  "צפני סתרים": "Secret Ciphers",
  "שפה סודית שאיש אינו יכול לפצח.":
    "A private language nobody has ever broken.",
  "רחפני ריגול": "Surveillance Drones",
  "עיניים מעופפות מעל מחנה האויב.":
    "Eyes in the air above the enemy camp.",
  "מצלמות זעירות": "Micro Cameras",
  "עדשות נסתרות שמתעדות כל מסמך.":
    "Hidden lenses recording every document.",
  "וירוסי מידע": "Data Viruses",
  "קוד שגונב תוכניות מארכיוני האויב.":
    "Code that lifts the plans straight out of the enemy's archives.",
  "רשת לוויינים": "Satellite Network",
  "עיניים בשמיים שרואות הכול מלמעלה.":
    "Eyes in the sky that see everything from above.",
  "פורצי הצפנה": "Codebreakers",
  "מכונות ששוברות כל קוד סתרים.":
    "Machines that break any cipher put in front of them.",
  "שתלי מוח": "Neural Implants",
  "טכנולוגיה שקוראת מחשבות של שבויים.":
    "Technology that reads a prisoner's thoughts.",
  "מרגלי כפילים": "Doppelgänger Agents",
  "עותקים מושלמים של מפקדי האויב.":
    "Perfect copies of the enemy's own commanders.",
  "רשת עצבים": "Neural Web",
  "רשת שחודרת לכל מערכת מידע של האויב.":
    "A web reaching into every system the enemy owns.",
  "עיני צל": "Shadow Eyes",
  "חיישנים בלתי נראים בכל פינה בממלכה.":
    "Invisible sensors in every corner of the realm.",
  "פורצי קוונטים": "Quantum Breakers",
  "מחשבים ששוברים כל הצפנה בשבריר שנייה.":
    "Machines that break any encryption in a fraction of a second.",
  "רוחות רפאים": "Ghosts",
  "סוכנים שאיש לא יודע שהם קיימים.":
    "Agents nobody knows exist.",
  "עין כול-רואה": "The All-Seeing Eye",
  "מערך שרואה כל תנועה בכל הממלכות.":
    "A network watching every movement in every realm.",
  "תודעת רשת": "Network Consciousness",
  "בינה שיודעת הכול עוד לפני שזה קורה.":
    "An intelligence that knows everything before it happens.",
  "עין המציאות": "The Eye of Reality",
  "ריגול שחודר את מסך הזמן עצמו.":
    "Espionage that reaches through the veil of time itself.",
  "עין קראלדור": "The Eye of Kraldor",
  "הריגול האולטימטיבי — שום סוד לא נסתר ממנה.":
    "The ultimate intelligence — no secret is hidden from it.",

  /* ------------------------------------------------------------------ */
  /* the base screen — command centre                                   */
  /* ------------------------------------------------------------------ */
  "בסיס | KRALDOR": "Base | KRALDOR",
  "מרכז הפיקוד": "Command Centre",
  "{season} התחילה!": "{season} has begun!",
  "העונה פעילה": "The season is live",
  "— בהצלחה לכולם בעונה החדשה!": "— good luck to everyone this season!",
  "סיום עונה:": "Season ends:",
  "פרטי בסיס": "Base Details",
  "עונה": "Season",
  "ללא": "None",
  "לעמוד הברית": "Go to guild",
  "הצטרף לברית": "Join a guild",
  "משאבים": "Resources",
  "מאוחסן:": "Stored:",
  "בבנק": "Banked",
  "פעילות אחרונה": "Recent Activity",
  "אין דיווחים עדיין. היכנס לפרופיל אימפריה מעמוד הדירוג כדי לרגל או לתקוף.":
    "No reports yet. Open an empire's profile from the rankings to spy on it or attack it.",
  "תקפת את": "You attacked",
  "הותקפת על ידי": "You were attacked by",
  "ריגלת אחרי": "You spied on",
  "ניצחון": "Victory",
  "הפסד": "Defeat",
  "הצלחה": "Success",
  "כישלון": "Failure",
  "הפקדה לבנק": "Bank deposit",
  "משיכה מהבנק": "Bank withdrawal",
  "ריבית מהבנק": "Bank interest",
  "לכל הדוחות ←": "All reports ←",

  /* ------------------------------------------------------------------ */
  /* world records — the board on the base screen and the profile case   */
  /* ------------------------------------------------------------------ */
  "שיאי העולם": "World Records",
  "שיאי המשחק ומי כבש אותם ראשון — מכל השחקנים בעולם":
    "The game's records, and who claimed each one first — across every player in the world",
  "שיאים שנכבשו": "records claimed",
  "על שמך": "in your name",
  "ימי שרת": "days on the server",
  "השיא שלך": "Your record",
  "הושג": "Reached",
  "ראשון בעולם:": "First in the world:",
  "השיא עדיין פנוי — אף אחד לא הגיע לכאן":
    "This record is still open — nobody has got here yet",
  "שיאי עולם": "World Records",
  "שיא עולם": "world record",
  "ראשון בעולם": "First in the world",
  "הישגים שאתה הראשון בעולם שהגיע אליהם":
    "Milestones you were the first in the world to reach",
  "הישגים שהאימפריה הזו הראשונה בעולם שהגיעה אליהם":
    "Milestones this empire was the first in the world to reach",

  /* the five capstones, as the records board names them */
  "להגיע לעיר 10": "Reach City 10",
  "להגיע לשדרוג של 500 אזרחים בעדכון יומי":
    "Reach 500 citizens per daily update",
  "גיבור הגיע לרמה 100": "Hero reaches level 100",
  "להגיע למקסימום מכרות": "Max out every mine",
  "להגיע לכל דגמי הנשק": "Own every weapon model",
  "האימפריה המלאה, כל עשר הערים": "The full empire — all ten cities",
  'שדרוג "קבלת מגויסים" עד 500 אזרחים בכל עדכון':
    'The "Citizen Intake" upgrade at 500 citizens per update',
  "הרמה האחרונה של הגיבור": "The hero's final level",
  "ארבעת המכרות ברמה {mines}": "All four mines at level {mines}",
  "כל {models} הדגמים במחסן": "All {models} models in the armory",

  /* ------------------------------------------------------------------ */
  /* achievements — the reward ladder                                    */
  /* ------------------------------------------------------------------ */
  "הושלמו": "Completed",
  "פרס אחד ממתין לך": "One reward is waiting for you",
  "{count} פרסים ממתינים לך": "{count} rewards are waiting for you",
  "אסוף הכל": "Collect all",
  "אוסף...": "Collecting…",
  "מוכן לאיסוף": "Ready to collect",
  "נאסף": "Collected",
  "נאספו {count} הישגים": "Collected {count} achievements",
  "האיסוף נכשל": "The collection failed",
  "אין הישגים בקטגוריה הזו": "No achievements in this category",
  "אין הישגים חדשים לאיסוף": "No new achievements to collect",

  /* categories — "ריגול" is already above, under the armory */
  "מלחמה": "War",
  "כלכלה": "Economy",
  "אימפריה": "Empire",
  "תהילה": "Glory",

  /* war */
  "{goal} תקיפות": "{goal} attacks",
  "פתח ב-{goal} תקיפות, בניצחון או בהפסד":
    "Launch {goal} attacks, win or lose",
  "תקיפה ראשונה": "First Strike",
  "תקוף אימפריה אחת מהדירוג": "Attack one empire from the rankings",
  "אלף תקיפות": "A Thousand Attacks",
  "פתח ב-1,000 תקיפות — מצביא אמיתי":
    "Launch 1,000 attacks — a true warlord",
  "{goal} ניצחונות": "{goal} victories",
  "נצח ב-{goal} תקיפות": "Win {goal} attacks",
  "ניצחון ראשון": "First Victory",
  "נצח בתקיפה אחת": "Win a single attack",
  "{goal} הדיפות": "{goal} repelled",
  "הדוף {goal} תקיפות על האימפריה שלך":
    "Repel {goal} attacks on your empire",
  "חומה ראשונה": "First Wall",
  "הדוף תקיפה אחת על האימפריה שלך": "Repel one attack on your empire",
  "{goal} חיילי אויב": "{goal} enemy soldiers",
  "חסל {goal} חיילי אויב בקרב": "Slay {goal} enemy soldiers in battle",
  "קוצר הנשמות": "The Reaper",
  "חסל 100,000 חיילי אויב": "Slay 100,000 enemy soldiers",
  "{goal} שבויים": "{goal} captives",
  "שבה {goal} חיילי אויב לעבדות מכרות":
    "Capture {goal} enemy soldiers into the mines",
  "שוד {goal} זהב": "{goal} gold plundered",
  "שדוד {goal} זהב מאימפריות אחרות":
    "Plunder {goal} gold from other empires",
  "מלך השודדים": "King of Thieves",
  "שדוד 10,000,000 זהב מאימפריות אחרות":
    "Plunder 10,000,000 gold from other empires",

  /* espionage */
  "{goal} משימות ריגול": "{goal} spy missions",
  "שלח {goal} משימות ריגול": "Send {goal} spy missions",
  "ריגול ראשון": "First Infiltration",
  "שלח מרגלים לאימפריה אחת": "Send spies to a single empire",
  "{goal} דוחות ריגול": "{goal} spy reports",
  "חזור עם {goal} דוחות ריגול מוצלחים":
    "Come back with {goal} successful spy reports",
  "דוח ראשון": "First Report",
  "חזור עם דוח ריגול מוצלח אחד": "Come back with one successful spy report",
  "צל האימפריה": "Shadow of the Empire",
  "חזור עם 300 דוחות ריגול מוצלחים":
    "Come back with 300 successful spy reports",
  "{goal} מרגלים": "{goal} spies",
  "אמן {goal} מרגלים": "Train {goal} spies",

  /* hero */
  "גיבור ברמה {goal}": "Hero at level {goal}",
  "העלה את הגיבור שלך לרמה {goal}": "Raise your hero to level {goal}",
  "גיבור בשיא": "Hero at the Peak",
  "העלה את הגיבור שלך לרמה {goal} — הרמה המרבית":
    "Raise your hero to level {goal} — the maximum",
  "{goal} איפוסי גיבור": "{goal} hero resets",
  "אפס את הגיבור {goal} פעמים לאחר שהגיע לשיא":
    "Reset your hero {goal} times after reaching the cap",
  "לידה מחדש": "Rebirth",
  "אפס את הגיבור בפעם הראשונה לאחר שהגיע לשיא":
    "Reset your hero for the first time after reaching the cap",
  "{goal} פריטי ציוד": "{goal} pieces of gear",
  "אסוף {goal} פריטי ציוד לגיבור": "Collect {goal} pieces of hero gear",
  "למצוא חפץ ראשון": "First Find",
  "נצח בתקיפה וזכה בציוד לגיבור": "Win an attack and take hero gear from it",
  "{goal} פריטים אפיים": "{goal} epic items",
  "זכה ב-{goal} פריטים בדרגת נדירות אפי":
    "Win {goal} items of epic rarity",
  "חפץ אפי": "Epic Relic",
  "זכה בפריט אחד בדרגת נדירות אפי": "Win one item of epic rarity",
  "{goal} פריטים אגדיים": "{goal} legendary items",
  "זכה ב-{goal} פריטים בדרגת נדירות אגדי":
    "Win {goal} items of legendary rarity",
  "חפץ אגדי": "Legendary Relic",
  "זכה בפריט אחד בדרגת נדירות אגדי": "Win one item of legendary rarity",
  "ציוד מלא": "Fully Equipped",
  "צייד את הגיבור בכל תשעת המשבצות בו-זמנית":
    "Fill all nine of your hero's slots at once",

  /* economy */
  "{goal} מכרות": "{goal} mines",
  "שדרג {goal} מכרות מעל רמה {start}":
    "Upgrade {goal} mines above level {start}",
  "לשדרג מכרה": "Upgrade a Mine",
  "שדרג מכרה אחד מעל רמה {start}": "Upgrade one mine above level {start}",
  "לשדרג את כל המכרות": "Upgrade Every Mine",
  "שדרג את ארבעת המכרות מעל רמה {start}":
    "Upgrade all four mines above level {start}",
  "כל המכרות ברמה {goal}": "All mines at level {goal}",
  "שדרג את ארבעת המכרות לרמה {goal} ומעלה":
    "Upgrade all four mines to level {goal} or higher",
  "תעשייה בשיא": "Industry at the Peak",
  "שדרג את ארבעת המכרות לרמה {goal} — הרמה המרבית":
    "Upgrade all four mines to level {goal} — the maximum",
  "כל המחסנים ברמה {goal}": "All warehouses at level {goal}",
  "שדרג את ארבעת המחסנים לרמה {goal} ומעלה":
    "Upgrade all four warehouses to level {goal} or higher",
  "{goal} זהב": "{goal} gold",
  "החזק {goal} זהב בבת אחת": "Hold {goal} gold at once",
  "מיליונר ראשון": "First Million",
  "החזק 1,000,000 זהב בבת אחת": "Hold 1,000,000 gold at once",
  "הון עתק": "Vast Fortune",
  "החזק 100,000,000 זהב בבת אחת": "Hold 100,000,000 gold at once",
  "{goal} הפקדות": "{goal} deposits",
  "בצע {goal} הפקדות בבנק": "Make {goal} deposits at the bank",
  "הפקדה ראשונה בבנק": "First Deposit",
  "הפקד זהב בבנק פעם אחת": "Deposit gold at the bank once",
  "{goal} זהב בבנק": "{goal} gold banked",
  "החזק {goal} זהב בחשבון הבנק": "Hold {goal} gold in your bank account",
  "{goal} תשלומי ריבית": "{goal} interest payments",
  "קבל {goal} תשלומי ריבית מהבנק":
    "Receive {goal} interest payments from the bank",
  "ריבית ראשונה": "First Interest",
  "קבל תשלום ריבית אחד מהבנק": "Receive one interest payment from the bank",
  "מחסנים מלאים": "Full Warehouses",
  "החזק מיליון עץ, מיליון ברזל ומיליון אבן בו-זמנית":
    "Hold a million wood, a million iron and a million stone at once",

  /* empire */
  "{goal} ערים": "{goal} cities",
  "ייסד אימפריה בת {goal} ערים": "Build an empire of {goal} cities",
  "לעלות עיר": "Found a City",
  "ייסד עיר שנייה": "Found a second city",
  "קיסרות": "Imperium",
  "החזק את כל {goal} הערים — האימפריה המלאה":
    "Hold all {goal} cities — the full empire",
  "קבלת מגויסים {goal}": "Citizen Intake {goal}",
  'שדרג את "קבלת מגויסים" לרמה {goal}':
    'Upgrade "Citizen Intake" to level {goal}',
  "לשדרג קבלת מגויסים": "Upgrade Citizen Intake",
  'שדרג את "קבלת מגויסים" לרמה 2': 'Upgrade "Citizen Intake" to level 2',
  "500 אזרחים ביום": "500 Citizens a Day",
  'שדרג את "קבלת מגויסים" לרמה {goal} — 500 אזרחים בכל עדכון יומי':
    'Upgrade "Citizen Intake" to level {goal} — 500 citizens per daily update',
  "עיר שוקקת": "A Teeming City",
  'שדרג את "קבלת מגויסים" לרמה {goal} — {citizens} אזרחים בכל עדכון יומי':
    'Upgrade "Citizen Intake" to level {goal} — {citizens} citizens per daily update',
  "כל השדרוגים ברמה {goal}": "Every upgrade at level {goal}",
  "העלה כל אחד משדרוגי האימפריה לרמה {goal} ומעלה":
    "Raise every empire upgrade to level {goal} or higher",
  "אימפריה משודרגת": "An Upgraded Empire",
  "העלה כל אחד משדרוגי האימפריה לרמה 5 ומעלה":
    "Raise every empire upgrade to level 5 or higher",
  "צבא של {goal}": "An army of {goal}",
  "אמן {goal} חיילים": "Train {goal} soldiers",
  "צבא אין-סופי": "An Endless Army",
  "אמן 100,000 חיילים": "Train 100,000 soldiers",
  "{goal} עבדי מכרות": "{goal} mine slaves",
  "החזק {goal} עבדי מכרות": "Hold {goal} mine slaves",
  "לקנות נשק התקפה": "Buy an Attack Weapon",
  "רכוש כלי נשק אחד מקטגוריית התקפה":
    "Buy one weapon from the attack category",
  "לקנות נשק הגנה": "Buy a Defence Weapon",
  "רכוש כלי נשק אחד מקטגוריית הגנה":
    "Buy one weapon from the defence category",
  "לקנות נשק ריגול": "Buy a Spy Weapon",
  "רכוש כלי נשק אחד מקטגוריית ריגול":
    "Buy one weapon from the espionage category",
  "{goal} דגמי נשק": "{goal} weapon models",
  "החזק {goal} דגמי נשק שונים": "Own {goal} different weapon models",
  "נשקייה מושלמת": "A Perfect Armory",
  "החזק את כל {goal} דגמי הנשק במשחק":
    "Own all {goal} weapon models in the game",
  "{goal} כלי נשק": "{goal} weapons",
  "החזק {goal} כלי נשק בסך הכל": "Own {goal} weapons in total",
  "דרגת נשק {goal} בכל הקטגוריות": "Weapon tier {goal} in every category",
  "פתח את דרגה {goal} בשלוש קטגוריות הנשק":
    "Unlock tier {goal} in all three weapon categories",
  "כל הדרגות פתוחות": "Every Tier Unlocked",
  "פתח את דרגה 30 בשלוש קטגוריות הנשק":
    "Unlock tier 30 in all three weapon categories",

  /* legacy */
  "להצטרף לגילדה": "Join a Guild",
  "הצטרף לגילדה קיימת או הקם אחת": "Join an existing guild or found one",
  "מנהיג גילדה": "Guild Leader",
  "הקם גילדה משלך והובל אותה": "Found your own guild and lead it",
  "{goal} ניצחונות על בוסים": "{goal} boss victories",
  "נצח את בוס העיר {goal} פעמים": "Beat your city boss {goal} times",
  "להביס את בוס העיר": "Beat the City Boss",
  "נצח את הבוס של העיר שלך": "Beat the boss of your city",
  "צייד העריצים": "Tyrant Hunter",
  "הבס את הבוסים של כל {cities} דרגות הערים":
    "Beat the bosses of all {cities} city tiers",
  "{goal} ניצחונות במיני-משחק": "{goal} mini-game wins",
  "נצח {goal} פעמים במיני-משחק": "Win the mini-game {goal} times",
  "ניצחון ראשון במיני-משחק": "First Mini-Game Win",
  "נצח פעם אחת במיני-משחק": "Win the mini-game once",
  "{goal} מכתבים": "{goal} letters",
  "שלח {goal} מכתבים לשחקנים אחרים":
    "Send {goal} letters to other players",
  "מכתב ראשון": "First Letter",
  "שלח מכתב לשחקן אחר": "Send a letter to another player",
  "לכבוש מקום ראשון בדירוג": "Take First Place",
  "היה מספר 1 בדירוג העיר שלך": "Be number 1 in your city's rankings",

  /* ------------------------------------------------------------------ */
  /* buildings, units, warehouses, empire upgrades                       */
  /* ------------------------------------------------------------------ */
  "כורה זהב מהאדמה. ככל שרמת המכרה גבוהה יותר ויש יותר עבדי מכרות — התפוקה עולה.":
    "Digs gold out of the ground. The higher the mine's level and the more slaves worked into it, the more it yields.",
  "עבדי המכרות כורתים כאן עץ לבנייה ולצבא.":
    "Your slaves fell timber here, for building and for the army.",
  "ברזל הוא הבסיס לכל כלי הנשק של האימפריה.":
    "Iron is the basis of every weapon the empire fields.",
  "אבן איכותית לחומות, מבנים וביצורים.":
    "Good stone for walls, buildings and fortifications.",
  "כאן מאומנים חיילי האימפריה.": "Where the empire's soldiers are trained.",
  "מרכז הריגול של האימפריה. נדרש להכשרת מרגלים.":
    "The empire's spy headquarters. Required to train spies.",

  "כוח הלחימה המרכזי של האימפריה.":
    "The empire's main fighting force.",
  "חושפים מידע על אימפריות יריבות.":
    "They uncover intelligence on rival empires.",
  "מוצבים במכרות ומגדילים את תפוקת המשאבים.":
    "Stationed in the mines, raising your resource output.",


  "מגדיל את כמות האזרחים שמתקבלת בכל עדכון יומי.":
    "Raises how many citizens arrive on every daily update.",
  "{citizens} אזרחים בכל עדכון יומי": "{citizens} citizens per daily update",
  "מגדיל את כח המודיעין שלך. ריגול מצליח כשכח המודיעין שלך גדול מזה של היעד — בלי הגרלה.":
    "Raises your intelligence rating. A spy mission succeeds when your rating beats the target's — no dice involved.",
  "+{pct}% כח מודיעין": "+{pct}% intelligence",
  "מגדיל את מספר ההפקדות שניתן לבצע בבנק בין עדכון יומי לעדכון יומי.":
    "Raises how many deposits you may make between one daily update and the next.",
  "{count} הפקדות בין עדכון יומי לעדכון יומי":
    "{count} deposits between daily updates",
  "מוסיף 1% לריבית שמתקבלת בבנק בכל עדכון יומי — עד {max}% ברמה {maxLevel}. הריבית מצטברת פעמיים ביום על זהב שאי אפשר לבזוז, ולכן הסולם יקר: כל רמה עולה פי {growth} מקודמתה.":
    "Adds 1% to the interest the bank pays on every daily update — up to {max}% at level {maxLevel}. It compounds twice a day on gold nobody can plunder, which is why the ladder is expensive: each level costs {growth}× the one before.",
  "{pct}% ריבית בכל עדכון יומי": "{pct}% interest per daily update",
  "מוסיף תור אחד לכל עדכון רגיל — כלומר {perDay} תורות נוספות ביום, לתמיד. לכן הסולם יקר: כל רמה עולה פי {growth} מקודמתה.":
    "Adds one turn to every regular update — {perDay} extra turns a day, forever. Which is why the ladder is expensive: each level costs {growth}× the one before.",
  "+{turns} תורות לעדכון רגיל ({perDay} ביום)":
    "+{turns} turns per regular update ({perDay} a day)",
  "מוסיף 1% לסיכוי לזכות בסיבוב גלגל מזל — מזריקת חפץ ומתקיפה מנצחת — עד {max}% ברמה המקסימלית. השדרוג היקר במשחק: כל רמה עולה פי {growth} מקודמתה.":
    "Adds 1% to your chance of winning a wheel spin — from discarding an item and from a winning attack — up to {max}% at the cap. The most expensive upgrade in the game: each level costs {growth}× the one before.",
  "+{pct}% סיכוי לסיבוב גלגל מזל": "+{pct}% chance of a wheel spin",

  /* ------------------------------------------------------------------ */
  /* the ten cities                                                      */
  /* ------------------------------------------------------------------ */
  "אשמורן": "Ashmoran",
  "משמר הגבול": "The Border Watch",
  "תרשיש": "Tarshish",
  "נמל האניות השבורות": "Harbour of Broken Ships",
  "כרכמיש": "Carchemish",
  "המעבר שמעבר לנהר": "The Crossing Beyond the River",
  "ארגוב": "Argov",
  "מבצר הבזלת": "The Basalt Fortress",
  "אופיר": "Ophir",
  "אוצר המדבר": "Treasure of the Desert",
  "תדמור": "Tadmor",
  "נווה העמודים": "Oasis of Columns",
  "מגידו": "Megiddo",
  "שדה הקרב האחרון": "The Last Battlefield",
  "פתרוס": "Pathros",
  "עיר הכבשנים": "City of Furnaces",
  "בבל": "Babel",
  "צל המגדל": "Shadow of the Tower",
  "כס הכתר השבור": "Seat of the Broken Crown",

  /* ------------------------------------------------------------------ */
  /* the ten city bosses                                                 */
  /* ------------------------------------------------------------------ */
  "ורקוס": "Varkos",
  "שובר השערים": "The Gatebreaker",
  "ענק משוריין שמנפץ שערי ערים במקבת אחת. הוא חונה על חורבות העיר הראשונה ודורש מס דמים מכל אימפריה שעולה לדרך.":
    "An armoured giant who shatters city gates with a single hammer blow. He camps on the ruins of the first city and demands a blood tax from every empire setting out.",
  "מורגהת": "Morgheth",
  "אלמנת האפר": "Widow of Ash",
  "מכשפה עטופת רעלות פחם ששרפה את ממלכתה שלה. כל מי שמתקרב לחומותיה נושם אפר — והאפר זוכר את שמו.":
    "A witch wrapped in veils of coal who burned her own kingdom. Anyone nearing her walls breathes ash — and the ash remembers their name.",
  "דראגור": "Dragor",
  "בן הברזל": "Son of Iron",
  "נולד בכבשן ומעולם לא הסיר את שריונו. חרב התליין שלו נעוצה באדמה, וסביבה קבורים כל מי שניסו להזיז אותה.":
    "Born in a furnace and never once out of his armour. His headsman's sword stands driven into the earth, and buried around it is everyone who tried to move it.",
  "סרפינה": "Serpina",
  "לוחשת הרעל": "The Poison Whisperer",
  "מלכת המתנקשים של הביצות הירוקות. היא לא נלחמת בצבאות — היא מרעילה את בארותיהם ומחכה שהמצור ייגמר מעצמו.":
    "Assassin queen of the green marshes. She does not fight armies — she poisons their wells and waits for the siege to end itself.",
  "קרון": "Karon",
  "רועה השבויים": "Shepherd of Captives",
  "סוחר עבדים במסכת ארד ללא פה. כל שרשרת שכרוכה על זרועו הייתה פעם צבא שלם שחשב שהוא חזק מספיק.":
    "A slaver in a bronze mask with no mouth. Every chain coiled on his arm was once an entire army that thought it was strong enough.",
  "אזראל": "Azrael",
  "נביא הלהבה": "Prophet of the Flame",
  "כוהן אש שפניו נמסו לתוך הלבה שהוא סוגד לה. הוא מטיף שכל אימפריה נועדה להישרף — ומקדים להגשים את הנבואה.":
    "A fire priest whose face melted into the lava he worships. He preaches that every empire is destined to burn — and hurries the prophecy along.",
  "תארוס": "Tharos",
  "מצביא הלגיון השחור": "Warlord of the Black Legion",
  "מפקד הלגיון שלא הפסיד קרב מעולם. הוא לא בא לבזוז — הוא בא למחוק את שם האימפריה מכל מפה קיימת.":
    "Commander of the legion that has never lost a battle. He does not come to plunder — he comes to erase your empire's name from every map there is.",
  "רית'ן": "Rithen",
  "מלך הצללים": "King of Shadows",
  "אין לו גוף, רק שריון שממשיך לצעוד. חרמש הצל שלו חותך דרך חומות כאילו הן לא היו שם מעולם.":
    "He has no body, only armour that keeps marching. His shadow scythe cuts through walls as though they had never been there.",
  "וולגריס": "Volgaris",
  "הר הפלדה": "The Steel Mountain",
  "טיטאן מצור בגובה חומה, ששריונו בנוי משערי הערים שהפיל. הוא לא צועד מהר — הוא פשוט לא נעצר.":
    "A siege titan as tall as a wall, armoured in the city gates he has felled. He does not march fast — he simply never stops.",
  "נוקס": "Nox",
  "קיסר הכתר השבור": "Emperor of the Broken Crown",
  "הקיסר האפל הראשון, שיושב על כס שבור מאז שהעולם היה צעיר. מי שמפיל אותו יורש את קראלדור כולה.":
    "The first dark emperor, seated on a broken throne since the world was young. Whoever fells him inherits all of Kraldor.",

  /* ------------------------------------------------------------------ */
  /* the hero — stats, gear slots, rarities, classes                     */
  /* ------------------------------------------------------------------ */
  /* "התקפה" and "הגנה" are already above, under the armory's categories */
  "כל אחוז מגדיל את כוח הצבא שלך בתקיפה.":
    "Every percent raises your army's power when you attack.",
  "כל אחוז מגדיל את כוח הצבא שלך בהגנה מפני תקיפות.":
    "Every percent raises your army's power when you are attacked.",
  "משאבים לעדכון רגיל": "resources per regular update",
  "כל אחוז נקודות מגדיל את תפוקת המכרות. פרי שטן, מכנסיים ונעליים מוסיפים משאבים בכמות קבועה בכל עדכון רגיל; חרב ומגן מגדילים את תפוקת המכרות באחוזים.":
    "Every allocated point raises mine output. The demon fruit, the trousers and the boots add a flat amount of resources on every regular update; the sword and the buckler raise mine output by a percentage.",
  "כל אחוז מחפצים מגדיל את סיכוי הצלחת משימת הריגול שלך.":
    "Every percent from gear raises the chance your spy mission succeeds.",
  "תורות לעדכון יומי": "turns per daily update",
  "חפצים מוסיפים תורות בכמות קבועה בכל עדכון יומי (לא באחוזים).":
    "Gear adds a flat number of turns on every daily update — never a percentage.",
  "אזרחים לעדכון יומי": "citizens per daily update",
  "חפצים מוסיפים אזרחים בכמות קבועה בכל עדכון יומי (לא באחוזים).":
    "Gear adds a flat number of citizens on every daily update — never a percentage.",
  "תפוקת המכרות": "mine output",
  "{resource} לעדכון רגיל": "{resource} per regular update",
  "תפוקת משאבים": "Resource output",
  "ניסיון גיבור": "Hero XP",

  /* rarities */
  "פשוט": "Plain",
  "מתקדם": "Advanced",
  "אליט": "Elite",
  "אגדי": "Legendary",
  // Hebrew names the object then its grade; English the other way round.
  "{slot} {rarity}": "{rarity} {slot}",

  /* gear slots */
  "חרב": "Sword",
  "כפפות": "Gauntlets",
  "קסדה": "Helmet",
  "שריון": "Armour",
  "מגן": "Buckler",
  "פרי שטן": "Demon Fruit",
  "כנפיים": "Wings",
  "מכנסיים": "Trousers",
  "נעליים": "Boots",

  /* the four classes */
  "המצביא": "The Warlord",
  "כוח הוא הטיעון היחיד": "Power is the only argument",
  "מפקד קרבות מלידה — צבאותיו מכים חזק יותר בכל תקיפה.":
    "A born battle commander — his armies hit harder on every attack.",
  "המגן": "The Guardian",
  "החומה שלא נפלה מעולם": "The wall that never fell",
  "שומר הסף של האימפריה — הגנתו עומדת גם מול המתקפות הקשות.":
    "The empire's gatekeeper — his defence holds even against the hardest assault.",
  "הסוחר": "The Merchant",
  "כל מלחמה מתחילה באוצר": "Every war begins in the treasury",
  "אשף כלכלה ערמומי — המכרות שלו מפיקים יותר מכל אחד אחר.":
    "A cunning economist — his mines yield more than anyone else's.",
  "הצל": "The Shadow",
  "מה שלא רואים — מנצח": "What is not seen, wins",
  "מרגל־מתנקש הלומד מכל קרב — ריגול חד יותר וניסיון נצבר מהר.":
    "A spy-assassin who learns from every fight — sharper espionage, faster experience.",

  /* the ten gear sets */
  "מסע הנווד": "The Wanderer's Journey",
  "ברזל הלגיון": "Legion Iron",
  "פלדת האביר": "Knight's Steel",
  "כפור הספיר": "Sapphire Frost",
  "זהב המלוכה": "Royal Gold",
  "אובסידיאן הדם": "Blood Obsidian",
  "להט המאגמה": "Magma Fervour",
  "זעם הסערה": "Storm Wrath",
  "תהום האינסוף": "The Endless Abyss",
  "זוהר האלים": "Radiance of the Gods",

  /* ------------------------------------------------------------------ */
  /* hero quests — the expedition board                                  */
  /* ------------------------------------------------------------------ */
  "פשיטת הגבול": "Border Raid",
  "שיירת אספקה חוצה את קצה הנחלה בלי ליווי. הגיבור יוצא לבדו, חוזר לפני רדת הלילה.":
    "A supply train crosses the edge of your holding unescorted. The hero rides out alone and is back before nightfall.",
  "ליווי השיירה": "Caravan Escort",
  "סוחרים משלמים בזהב כדי שמישהו יצעד לצדם דרך המעבר. הגיבור לוקח את התשלום ואת מה שנופל בדרך.":
    "Merchants pay gold for someone to walk the pass beside them. The hero takes the fee — and whatever falls along the way.",
  "טיהור המאורה": "Clearing the Den",
  "מערה מתחת לגבעות שממנה יוצאים פושטים כל לילה. מי שנכנס פנימה חייב לצאת עם ראש.":
    "A cave under the hills that raiders pour out of every night. Whoever goes in must come out with a head.",
  "ציד ראשי השבט": "Chieftain Hunt",
  "שלושה ראשי שבט חולקים את הערבה ואת השלל שגנבו ממך. הגיבור יוצא לגבות חוב.":
    "Three chieftains share the steppe — and the plunder they took from you. The hero rides out to collect.",
  "מצור על מעוז הפורעים": "Siege of the Bandit Hold",
  "מבצר עץ על צוק, ובתוכו כל מה שנשדד מהאזור בעשור האחרון. מצור לוקח זמן.":
    "A timber fort on a cliff, holding everything looted from the region this decade. A siege takes time.",
  "חציית ארץ האפר": "Crossing the Ashlands",
  "אין שם דרך ואין שם מים — רק ערים שרופות שאיש לא בזז מאז שנפלו.":
    "No road and no water — only burned cities nobody has looted since they fell.",
  "שוד גנזך הנסיך": "The Prince's Vault",
  "נסיך גולה החביא את אוצרו מתחת לארמון נטוש. המפה עלתה לגיבור יותר ממה שהוא מודה.":
    "An exiled prince hid his treasury under an abandoned palace. The map cost the hero more than he admits.",
  "מסע אל ההרים השבורים": "Into the Broken Mountains",
  "מעברים שקפואים תשעה חודשים בשנה, ומנזר בפסגה ששומר על משהו ישן מהאימפריה.":
    "Passes frozen nine months of the year, and a monastery at the summit guarding something older than the empire.",
  "משלחת מעבר לים": "Expedition Overseas",
  "ספינה אחת, צוות ששכרת בנמל, ויבשת שאיש מאנשיך לא ראה. הוא יחזור — כנראה.":
    "One ship, a crew hired at the docks, and a continent none of your people has seen. He will be back — probably.",
  "עלייה למגדל הכתר השבור": "Ascent of the Broken Crown",
  "המגדל שממנו שלט הקיסר האפל הראשון. יממה שלמה של טיפוס, ובראשו כל מה שנשאר מקראלדור הישנה.":
    "The tower the first dark emperor ruled from. A full day of climbing, and at the top everything left of the old Kraldor.",

  /* how a quest turned out */
  "מסע קשה": "A Hard Road",
  "הדרך גבתה את שלה — הוא חוזר חבול ועם מעט מכפי שקיווה.":
    "The road took its due — he comes back bruised and with less than he hoped for.",
  "מסע כשורה": "A Journey as Planned",
  "בלי הפתעות. יצא, עשה את שלו, חזר עם מה שמגיע.":
    "No surprises. He went, did what he went to do, and came back with what was owed.",
  "מסע מוצלח": "A Good Journey",
  "הוא מצא יותר משציפה, וידע לקחת את הכול.":
    "He found more than he expected, and knew to take all of it.",
  "שלל אדיר": "A Mighty Haul",
  "עגלה שלמה נגררת אחריו, וחצי מהעיר יצאה לראות.":
    "A whole cart dragging behind him, and half the city came out to look.",
  "מסע אגדי": "A Legendary Journey",
  "על מסע כזה מספרים בטברנות שנים אחרי שהגיבור כבר איננו.":
    "They tell of a journey like this in taverns years after the hero is gone.",

  /* ------------------------------------------------------------------ */
  /* potions                                                             */
  /* ------------------------------------------------------------------ */
  "שיקוי הניסיון": "Potion of Experience",
  "פי 2 ניסיון גיבור בקרבות": "Double hero XP in battle",
  "כל עוד השיקוי פועל, כל נקודת ניסיון שהגיבור שלך מרוויח בקרב נספרת פעמיים — בתקיפות, בהגנות מוצלחות ובקרבות מול שליטי הערים.":
    "While it holds, every point of experience your hero earns in battle counts twice — attacking, defending successfully, and fighting a city ruler.",
  "שיקוי השפע": "Potion of Plenty",
  "פי 2 משאבים — ביזה ותפוקה": "Double resources — plunder and output",
  "כל עוד השיקוי פועל, הביזה שאתה לוקח מתקיפות מוצלחות מוכפלת, וגם המכרות שלך מייצרים כפול בכל עדכון רגיל.":
    "While it holds, the plunder you take from won attacks is doubled, and your mines also produce double on every regular update.",
  "שיקוי החסינות": "Potion of Immunity",
  "הגיבור לא סופג נזק": "Your hero takes no damage",
  "כל עוד השיקוי פועל, הגיבור שלך לא מאבד חיים — גם אם תוקף פורץ את ההגנה שלך, הוא יוצא מהקרב ללא שריטה. שאר הקרב (ביזה, שבויים) מתנהל כרגיל.":
    "While it holds, your hero loses no health — even if an attacker breaks through your defence, he walks away without a scratch. The rest of the battle (plunder, captives) plays out as usual.",
  "שיקוי הנפח": "Potion of the Smith",
  "50% הנחה על שדרוג חפצים": "50% off item upgrades",
  "כל עוד השיקוי פועל, כל שדרוג חפץ בתיק או על הגיבור עולה חצי מחיר — גם בשדרוג בודד וגם ב'שדרג הכל'.":
    "While it holds, upgrading any item — in the bag or on the hero — costs half price, both one at a time and with \"upgrade all\".",

  /* ------------------------------------------------------------------ */
  /* durations — Hebrew has a dual, so one/two/many are three sentences   */
  /* ------------------------------------------------------------------ */
  "רגע": "a moment",
  "דקה": "a minute",
  "שתי דקות": "two minutes",
  "{count} דקות": "{count} minutes",
  "שעה": "an hour",
  "חצי שעה": "half an hour",
  "שעתיים": "two hours",
  "{count} שעות": "{count} hours",
  "יום": "a day",
  "יומיים": "two days",
  "{count} ימים": "{count} days",

  /* ------------------------------------------------------------------ */
  /* the guild — roles, spells, the nightly war                          */
  /* ------------------------------------------------------------------ */
  "מנהיג": "Leader",
  "סגן": "Deputy",
  "חבר": "Member",
  "קסם התקפה": "Attack Spell",
  "מגביר את כוח ההתקפה שלך בקרבות.": "Raises your attack power in battle.",
  "+{pct}% לכוח ההתקפה למשך {hours} שעות":
    "+{pct}% attack power for {hours} hours",
  "קסם הגנה": "Defence Spell",
  "מגביר את כוח ההגנה שלך כשמתקיפים אותך.":
    "Raises your defence power when you are attacked.",
  "+{pct}% לכוח ההגנה למשך {hours} שעות":
    "+{pct}% defence power for {hours} hours",
  "קסם משאבים": "Resource Spell",
  "מאיץ את תפוקת המכרות של האימפריה שלך.":
    "Speeds up your empire's mine output.",
  "+{pct}% לתפוקת המכרות למשך {hours} שעות":
    "+{pct}% mine output for {hours} hours",
  "אלופת המלחמה": "War Champion",
  "סגנית האלופה": "Runner-Up",
  "{count} אזרחים": "{count} citizens",
  "{count} תורות": "{count} turns",
  "סיבוב גלגל אחד": "one wheel spin",
  "{count} סיבובי גלגל": "{count} wheel spins",
  "ההרשמה פתוחה": "Registration is open",
  "הקרב בעיצומו": "The battle is under way",
  "סופרים את הנקודות": "Counting the points",
  "המלחמה הוכרעה": "The war is decided",
  "המלחמה בוטלה": "The war was called off",

  /* ------------------------------------------------------------------ */
  /* power ledgers, mine output lines                                    */
  /* ------------------------------------------------------------------ */
  "בונוס גיבור": "Hero bonus",
  "קסם ברית": "Guild spell",
  "עזרת ברית": "Guild aid",
  "בונוס מגן": "Defender's bonus",
  "ערים — ×{cities}": "Cities — ×{cities}",
  "קסם גילדה — משאבים": "Guild spell — resources",
  "בוסט יהלומים": "Diamond boost",

  /* ------------------------------------------------------------------ */
  /* the diamond shop and store                                          */
  /* ------------------------------------------------------------------ */
  "מגן משאבים": "Resource Shield",
  "תוקף שמנצח אותך לא לוקח ולו משאב אחד — הזהב, העץ, הברזל והאבן שלך נשארים אצלך.":
    "An attacker who beats you takes not one resource — your gold, wood, iron and stone stay yours.",
  "מגן משאבים פעיל — לא ניתן לבזוז ממנו משאבים":
    "Resource shield active — nothing can be plundered from this empire",
  "מגן חיילים": "Soldier Shield",
  "תוקף שמנצח אותך לא משעבד אף חייל — הצבא שלך יוצא מהקרב בגודלו המלא.":
    "An attacker who beats you enslaves no soldier — your army leaves the battle at full strength.",
  "מגן חיילים פעיל — לא ניתן לשעבד את חייליו":
    "Soldier shield active — this empire's soldiers cannot be enslaved",
  "ניצוץ": "Spark",
  "פיקדון": "Deposit",
  "ארגז אוצר": "Treasure Chest",
  "כספת הקיסר": "The Emperor's Vault",
  "אוצר הכתר": "The Crown Hoard",

  /* ------------------------------------------------------------------ */
  /* season prizes, the wheel, mini-games                                */
  /* ------------------------------------------------------------------ */
  "מקום ראשון": "First place",
  "מקום שני": "Second place",
  "מקום שלישי": "Third place",
  "חפץ לגיבור": "Hero item",
  "דורש מקום פנוי בתיק הגיבור": "Needs a free slot in the hero's bag",
  "סיבובים": "Spins",
  "{amount} {resource}": "{amount} {resource}",
  "כבוד בלבד": "Honour only",
  "מצא את הכדור": "Find the Ball",
  "פריצת הכספת": "Crack the Safe",

  /* ------------------------------------------------------------------ */
  /* the VIP pass                                                        */
  /* ------------------------------------------------------------------ */
  "חותם המלוכה": "The Royal Seal",
  "הפעולה הזו נפתחת עם {vip} — לחיצה על הכפתור הנעול פותחת את הרכישה":
    "This action opens with {vip} — press the locked button to buy it",
  "נעול · נפתח עם {vip}": "Locked · opens with {vip}",
  "בנק · הפקד הכל · משוך הכל": "Bank · deposit all · withdraw all",
  "כל הזהב הזמין נכנס לחיסכון (או חוזר ממנו) בלי להקליד סכום.":
    "All your available gold goes into savings (or comes back out) without typing an amount.",
  "מחסנים · הפקד הכל · משוך הכל": "Warehouses · store all · take all",
  "כל מחסן מתמלא או מתרוקן בלחיצה, במקום הקלדת כמות בכל אחד מהארבעה.":
    "Each warehouse fills or empties in one press, instead of typing a quantity into all four.",
  "מכרות · הצב הכל · חלק שווה · שדרג למקסימום":
    "Mines · assign all · split evenly · upgrade to max",
  "כל עבדי המכרות למשאב אחד או בחלוקה שווה, ומכרה שעולה רמות עד שנגמר התקציב.":
    "Every mine slave onto one resource or split evenly, and a mine that climbs levels until the budget runs out.",
  "מפקדה בכל מסך": "A command post on every screen",
  "כפתור בסרגל העליון שפותח את כל הפעולות האלה מכל עמוד במשחק.":
    "A button in the top bar that opens all of these from any page in the game.",

  /* ------------------------------------------------------------------ */
  /* Happy Hour                                                          */
  /* ------------------------------------------------------------------ */
  "ניסיון בקרבות": "Battle experience",
  "כל נקודת ניסיון שהגיבור מרוויח בתקיפה, בהגנה ומול שליטי הערים":
    "Every point of experience your hero earns attacking, defending and fighting city rulers",
  "ביזה מאויבים ומבוסים": "Plunder from enemies and bosses",
  "ביזה": "Plunder",
  "המשאבים שאתה לוקח מאימפריה מובסת ומהשלל של שליט העיר":
    "The resources you take from a beaten empire and from a city ruler's hoard",
  "תפוקת מכרות": "Mine output",
  "מכרות": "Mines",
  "כל עדכון רגיל — המכרות שלך מייצרים בקצב המוגבר":
    "Every regular update — your mines produce at the raised rate",

  /* ------------------------------------------------------------------ */
  /* the boss duel — moves, stances, grades                              */
  /* ------------------------------------------------------------------ */
  "מחץ כבד": "Heavy Crush",
  "מרים את נשקו מעל הראש — מכה אחת, כל הכוח בה":
    "He raises his weapon overhead — one blow, all of his strength in it",
  "מכה אנכית הרסנית. חומת מגן בולמת אותה כמעט לגמרי.":
    "A devastating overhead strike. A shield wall stops almost all of it.",
  "סער סוחף": "Sweeping Storm",
  "פורש את זרועותיו לרוחב וסוחף את הקו כולו":
    "He spreads his arms wide and sweeps the whole line",
  "פוגע בכל השורה הצפופה. תמרון עוקף מפזר את הכוח מתחת למכה.":
    "It hits the entire packed rank. A flanking manoeuvre spreads your force out from under it.",
  "פרצה בהגנה": "An Opening",
  "מתנשם כבדות — ההגנה שלו נפערת לרגע":
    "He is breathing hard — his guard gapes open for a moment",
  "חלון ההזדמנות. הסתערות חזית מכפילה כאן את הנזק.":
    "The window. A frontal charge doubles your damage here.",
  "הסתערות חזית": "Frontal Charge",
  "נזק מקסימלי, חשוף למכות": "Maximum damage, wide open to blows",
  "חומת מגן": "Shield Wall",
  "אבדות מינימליות, נזק נמוך": "Minimal losses, low damage",
  "תמרון עוקף": "Flanking Manoeuvre",
  "מאוזן — טוב מול סער": "Balanced — good against the sweep",
  "זעם הגיבור": "The Hero's Fury",
  "מכת מחץ אחת, מתעלמת מהמהלך": "One crushing blow that ignores his move",
  "מושלם": "Flawless",
  "מצוין": "Excellent",
  "טוב": "Good",
  "מדשדש": "Scraping by",

  /* ------------------------------------------------------------------ */
  /* chat                                                                */
  /* ------------------------------------------------------------------ */
  "{name} מקליד…": "{name} is typing…",
  "{names} מקלידים…": "{names} are typing…",
  " ו": " and ",
  "{count} שחקנים מקלידים…": "{count} players are typing…",

  /* ------------------------------------------------------------------ */
  /* the bank                                                            */
  /* ------------------------------------------------------------------ */
  "בנק | קראלדור": "Bank | Kraldor",
  "תשואה יומית": "Daily Yield",
  "זהב/יום": "gold/day",
  "ריבית נוכחית:": "Current rate:",
  "הפקדות זמינות להיום:": "Deposits left today:",
  "העדכון היומי הבא:": "Next daily update:",
  "שדרוגי בנק": "Bank Upgrades",
  "עבור לשדרוגים": "Go to upgrades",
  "תנועות אחרונות": "Recent Movements",
  "אין עדיין תנועות בבנק.": "No bank movements yet.",
  "יתרה:": "Balance:",
  "הפקדה": "Deposit",
  "משיכה": "Withdrawal",
  "ריבית": "Interest",
  "הופקדו {amount} זהב בבנק": "Deposited {amount} gold at the bank",
  "נמשכו {amount} זהב מהבנק": "Withdrew {amount} gold from the bank",
  "ניצלת את כל ההפקדות הזמינות עד העדכון היומי הבא.":
    "You have used every deposit available until the next daily update.",
  "יש למשוך זהב מהמחסן לפני שניתן להפקיד אותו בבנק.":
    "Gold has to come out of the warehouse before it can be banked.",
  "אין מספיק זהב זמין להפקדה.": "You do not have enough available gold to deposit.",
  "אין מספיק זהב בבנק למשיכה.": "You do not have enough gold in the bank.",
  "אין זהב למשיכה מהבנק.": "There is no gold to withdraw.",

  /* ------------------------------------------------------------------ */
  /* empire upgrades screen                                              */
  /* ------------------------------------------------------------------ */
  "שדרוגים | קראלדור": "Upgrades | Kraldor",
  "כל עלייה בעיר מכפילה את תפוקת המכרות (×מספר העיר) ופותחת עוד רמות לשדרוג קבלת האזרחים — עד":
    "Every city you rise to multiplies mine output (× the city number) and unlocks more levels of citizen intake — up to",
  "תפוקה ברמת עיר {max}. אין תקרה לכמות האזרחים שאפשר לצבור.":
    "output at city {max}. There is no ceiling on how many citizens you may hold.",
  "הממלכה שלך": "Your Realm",
  "ערים": "Cities",
  "שדרוגי אימפריה קבועים שמשפרים אזרחים, מודיעין, בנקאות וקבלת תורות.":
    "Permanent empire upgrades improving citizens, intelligence, banking and turn income.",
  "כעת:": "Now:",
  "אחרי שדרוג:": "After upgrading:",
  "עלות שדרוג:": "Upgrade cost:",
  "אין מספיק מהמשאב הזה לשדרוג": "Not enough of this resource for the upgrade",
  "משדרג...": "Upgrading…",
  "שדרג לרמה {level}": "Upgrade to level {level}",

  /* guild shop card */
  "פעיל עד {time}": "Active until {time}",
  "מטיל קסם...": "Casting…",
  "הטל קסם": "Cast",
  "שדרג ל־{pct}%": "Upgrade to {pct}%",
  "עזרה מקסימלית ({max}%)": "Maximum aid ({max}%)",

  /* ------------------------------------------------------------------ */
  /* server actions — refusals, receipts and confirmations               */
  /* ------------------------------------------------------------------ */
  "בחירה לא תקינה": "That choice is not valid",
  "בקשה לא תקינה": "That request is not valid",
  "פריט לא תקין": "That item is not valid",
  "לא נבחרו פריטים": "No items selected",
  "חבר לא תקין": "That member is not valid",
  "ברית לא תקינה": "That guild is not valid",
  "קסם לא תקין": "That spell is not valid",
  "משאב לא תקין": "That resource is not valid",
  "מגן לא תקין": "That shield is not valid",
  "חבילה לא תקינה": "That package is not valid",
  "משך מגן לא תקין": "That shield duration is not valid",
  "משימה לא תקינה": "That quest is not valid",
  "שיקוי לא תקין": "That potion is not valid",
  "שם לא תקין": "That name is not valid",
  "שם ברית לא תקין": "That guild name is not valid",
  "שם הברית קצר מדי": "That guild name is too short",
  "שם הברית ארוך מדי": "That guild name is too long",
  "הזן שם אימפריה": "Enter an empire name",

  /* the hero */
  "הגיבור לא נמצא": "Hero not found",
  "אין לך גיבור": "You have no hero",
  "אין מספיק נקודות גיבור פנויות": "You do not have enough unspent hero points",
  "+{amount}% {stat} — הנקודות הוקצו!": "+{amount}% {stat} — points allocated.",
  "איפוס גיבור זמין רק ברמה {level}":
    "A hero reset is only available at level {level}",
  "הגיבור אופס! קיבלת {citizens} אזרחים, {turns} תורות ו-{points} נקודות גיבור":
    "Your hero has been reset. You received {citizens} citizens, {turns} turns and {points} hero points.",
  "הפריט לא נמצא בתיק שלך": "That item is not in your bag",
  "הפריטים לא נמצאו בתיק שלך": "Those items are not in your bag",
  "הפריט כבר לבוש": "That item is already equipped",
  "הפריט אינו לבוש": "That item is not equipped",
  "דרוש גיבור רמה {required} כדי ללבוש את הפריט (אתה ברמה {level})":
    "Wearing this needs a level {required} hero — yours is level {level}",
  "{item} נלבש!": "{item} equipped.",
  "{item} הוסר לתיק": "{item} went back into the bag",
  "התיק מלא — לא ניתן להסיר את הפריט": "Your bag is full — the item cannot come off",
  "{item} נזרק": "{item} discarded",
  "{item} נזרק — ומזל טוב! 🎡 זכית בסיבוב גלגל מזל!":
    "{item} discarded — and congratulations! 🎡 You won a wheel spin.",
  "{count} חפצים נזרקו": "{count} items discarded",
  "{count} חפצים נזרקו — ומזל טוב! 🎡 זכית ב-{spins} סיבובי גלגל מזל!":
    "{count} items discarded — and congratulations! 🎡 You won {spins} wheel spins.",
  "הפריט כבר ברמה הגבוהה ביותר": "That item is already at its highest level",
  'אגדי הוא שיא הסט "{set}" — הסט הבא מגיע כשלל בקרב':
    'Legendary is the ceiling of the "{set}" set — the next set arrives as battle plunder',
  "דרוש גיבור רמה {required} כדי לשדרג (אתה ברמה {level})":
    "Upgrading this needs a level {required} hero — yours is level {level}",
  "דרוש {cost} זהב לשדרוג (יש לך {gold})":
    "The upgrade costs {cost} gold — you have {gold}",
  "אין מספיק זהב לשדרוג": "You do not have enough gold for the upgrade",
  "{item} שודרג לרמה {level} ({rarity})!":
    "{item} upgraded to level {level} ({rarity}).",
  "אין פריטים לשדרוג מבין הנבחרים": "None of the selected items can be upgraded",
  "אין מספיק זהב — השדרוג הזול ביותר עולה {cost} זהב":
    "Not enough gold — the cheapest upgrade costs {cost} gold",
  " ({count} לא שודרגו — חסר זהב)": " ({count} left unupgraded — not enough gold)",
  "{count} חפצים שודרגו תמורת {gold} זהב{suffix}":
    "{count} items upgraded for {gold} gold{suffix}",
  "כבר אפסת נקודות גיבור העונה":
    "You have already reset your hero points this season",
  "אין נקודות מוקצות לאיפוס": "There are no allocated points to reset",
  "{count} נקודות גיבור שוחררו מחדש להקצאה!":
    "{count} hero points are yours to spend again.",
  "הגיבור בחיים — אין צורך בהחייאה": "Your hero is alive — no revival needed",
  "דרושים {cost} יהלומים להחייאת הגיבור":
    "Reviving your hero costs {cost} diamonds",
  "הגיבור קם לתחייה עם 100% חיים — כל הבונוסים שלו חזרו!":
    "Your hero is back at 100% health — every one of his bonuses is live again.",

  /* hero quests */
  "לוח המסעות סגור כרגע.": "The expedition board is closed right now.",
  '"{quest}" נפתחת עם העיר ה-{tier} שלך.':
    '"{quest}" opens with your city {tier}.',
  "הגיבור מת — אי אפשר לשלוח אותו למסע עד שיקום לתחייה.":
    "Your hero is dead — he cannot be sent out until he is raised.",
  "הגיבור כבר במסע — הוא יוצא רק לאחד בכל פעם.":
    "Your hero is already away — he only takes one expedition at a time.",
  'נדרשות {turns} תורות כדי לשלוח את הגיבור ל"{quest}".':
    'Sending your hero to "{quest}" costs {turns} turns.',
  'הגיבור יצא ל"{quest}". הוא יחזור בעוד {duration}.':
    'Your hero has set out for "{quest}". He will be back in {duration}.',
  "הגיבור אינו במסע.": "Your hero is not away.",
  "המסע": "the expedition",
  "{quest} עדיין בעיצומו.": "{quest} is still under way.",
  "המסע כבר נאסף.": "That expedition has already been collected.",
  '{fortune}! הגיבור חזר מ"{quest}" עם {spoils}. {lore}':
    '{fortune}! Your hero is back from "{quest}" with {spoils}. {lore}',

  /* potions */
  "אין לך {potion} בתרמיל": "You have no {potion} in your satchel",
  "{potion} הוארך ב־{duration} נוספות!": "{potion} extended by another {duration}.",
  "{potion} פועל! {tagline} למשך {duration}.":
    "{potion} is live. {tagline}, for {duration}.",

  /* the guild */
  "אינך חבר בברית.": "You are not in a guild.",
  "אתה כבר חבר בברית.": "You are already in a guild.",
  "אתה כבר מנהיג הברית.": "You are already the guild's leader.",
  "שם הברית כבר תפוס — בחר שם אחר.": "That guild name is taken — pick another.",
  "הקמת ברית עולה {cost} יהלומים — אין לך מספיק.":
    "Founding a guild costs {cost} diamonds — you do not have enough.",
  'הברית "{guild}" הוקמה — אתה המנהיג!':
    'The guild "{guild}" is founded — you are its leader.',
  "הברית לא נמצאה.": "That guild was not found.",
  'הצטרפות ל"{guild}" אפשרית רק בהזמנה — בקש ממנהיג הברית או מסגן להזמין אותך.':
    'Joining "{guild}" is by invitation only — ask its leader or a deputy to invite you.',
  'הצטרפת לברית "{guild}"!': 'You have joined "{guild}".',
  "הברית מלאה או שאירעה שגיאה — נסה שוב.":
    "The guild is full, or something went wrong — try again.",
  "ההזמנה נדחתה.": "Invitation declined.",
  'הברית "{guild}" פורקה.': 'The guild "{guild}" is disbanded.',
  'עזבת את הברית "{guild}".': 'You have left "{guild}".',
  "רק מנהיג או סגן יכולים לצרף שחקנים לברית.":
    "Only a leader or a deputy may recruit into the guild.",
  'לא נמצאה אימפריה בשם "{name}".': 'No empire named "{name}" was found.',
  "{name} כבר חבר בברית אחרת.": "{name} is already in another guild.",
  "הברית מלאה — הרחב את הקיבולת קודם.":
    "The guild is full — buy a seat first.",
  "נשלחה הזמנה ל{name} (תקפה {hours} שעות).":
    "Invitation sent to {name} — good for {hours} hours.",
  "לא ניתן להרחיק את עצמך — השתמש בעזיבת הברית.":
    "You cannot kick yourself — leave the guild instead.",
  "החבר לא נמצא בברית.": "That member is not in the guild.",
  "אין לך הרשאה להרחיק את החבר הזה.": "You may not kick that member.",
  "{name} הורחק מהברית.": "{name} has been removed from the guild.",
  "רק המנהיג יכול לשנות תפקידים.": "Only the leader may change roles.",
  "לא ניתן לשנות את התפקיד של עצמך.": "You cannot change your own role.",
  "{name} מונה לסגן.": "{name} is now a deputy.",
  "{name} הורד לחבר מן השורה.": "{name} is back to a plain member.",
  "רק המנהיג יכול להעביר את ההנהגה.": "Only the leader may hand over the crown.",
  "{name} הוא מנהיג הברית החדש.": "{name} is the guild's new leader.",
  "הקסם לא נמצא.": "That spell was not found.",
  "הקסם כבר ברמה המקסימלית ({max}%).":
    "That spell is already at its ceiling ({max}%).",
  "השדרוג עולה {cost} יהלומים — אין לך מספיק.":
    "The upgrade costs {cost} diamonds — you do not have enough.",
  "{spell} שודרג ל־{pct}% עבור כל הברית!":
    "{spell} raised to {pct}% for the whole guild.",
  "רק מנהיג או סגן יכולים להרחיב את הברית.":
    "Only a leader or a deputy may expand the guild.",
  "הברית כבר בקיבולת המקסימלית ({max} חברים).":
    "The guild is already at its maximum size ({max} members).",
  "ההרחבה עולה {cost} זהב מהזהב הזמין שלך — אין לך מספיק.":
    "The seat costs {cost} gold out of your own available gold — you do not have enough.",
  "הברית הורחבה ל־{max} חברים!": "The guild now seats {max} members.",
  "עזרת הברית כבר ברמה המקסימלית ({max}%).":
    "Guild aid is already at its ceiling ({max}%).",
  "השדרוג עולה {cost} זהב מהזהב הזמין שלך — אין לך מספיק.":
    "The upgrade costs {cost} gold out of your own available gold — you do not have enough.",
  "עזרת הברית שודרגה ל־{pct}% מהכוח הכולל של הברית!":
    "Guild aid raised to {pct}% of the guild's combined power.",
  "הקסם הזה כבר פעיל עליך.": "That spell is already on you.",
  "הקסם עולה {cost} יהלומים — אין לך מספיק.":
    "The cast costs {cost} diamonds — you do not have enough.",
  "{icon} {spell} הופעל — {effect}!": "{icon} {spell} is live — {effect}.",

  /* the guild war */
  "רק מנהיג או סגן יכולים לרשום את הברית למלחמה.":
    "Only a leader or a deputy may enter the guild in the war.",
  "הברית שלך כבר רשומה למלחמה הקרובה.":
    "Your guild is already entered in the next war.",
  "{guild} נרשמה למלחמת הבריתות! הקרב מתנהל אוטומטית בין {start} ל־{end} — אין מה לעשות חוץ מלצפות.":
    "{guild} is entered in the guild war. The battle runs itself between {start} and {end} — there is nothing to do but watch.",
  "רק מנהיג או סגן יכולים לבטל את ההרשמה.":
    "Only a leader or a deputy may withdraw the entry.",
  "הברית שלך לא רשומה למלחמה הקרובה.":
    "Your guild is not entered in the next war.",
  "ההרשמה למלחמה בוטלה.": "Your entry has been withdrawn.",

  /* the wheel */
  "אין סיבובים זמינים": "You have no spins left",
  "זכית ב־{amount} יהלומים!": "You won {amount} diamonds.",
  "זכית ב־{amount} זהב!": "You won {amount} gold.",
  "זכית ב־{amount} ברזל!": "You won {amount} iron.",
  "זכית ב־{amount} אבן!": "You won {amount} stone.",
  "זכית ב־{amount} עץ!": "You won {amount} wood.",
  "זכית ב־{amount} אזרחים!": "You won {amount} citizens.",
  "זכית ב־{item} לתיק הגיבור!": "You won {item} for your hero's bag.",
  "התיק מלא — קיבלת {amount} זהב במקום החפץ.":
    "Your bag is full — you were paid {amount} gold instead of the item.",
  "זכית בפרס!": "You won a prize.",

  /* mini-games */
  "אימפריה אלמונית": "An unknown empire",
  "במקום": "in place",
  "בקוד": "in the code",
  "בחוץ": "not in it",
  "{count} {mark}": "{count} {mark}",
  "🔐 {marks}": "🔐 {marks}",
  "בחר ניחוש תקין": "Pick a valid guess",
  "המשחק הסתיים": "The game is over",
  "חשבון הנהלה אינו משתתף במשחקי הצד":
    "A staff account does not play the side games",
  "כבר פתרת את המשחק 🎉": "You have already solved it 🎉",
  "נגמרו הניסיונות": "You are out of attempts",
  "🫙 הכוס ריקה…": "🫙 The cup is empty…",
  "😔 נגמרו הניסיונות — נסה בפעם הבאה":
    "😔 Out of attempts — better luck next time",
  "✅ ניחשת נכון! אך כל הפרסים כבר חולקו":
    "✅ Correct — but every prize has already gone",
  "🎉 ניצחת! הפרס בדרך: {prize}": "🎉 You won! The prize is on its way: {prize}",
  '🎉 ניצחת ב"{game}"!': '🎉 You won "{game}"!',
  "כל הכבוד! זכית בפרס: {prize}": "Well played — your prize: {prize}",

  /* chat and mail */
  "לאט יותר — המתן רגע לפני ההודעה הבאה":
    "Slow down — wait a moment before the next message",
  "כתוב הודעה (עד {max} תווים)": "Write a message (up to {max} characters)",
  "אי אפשר לשלוח הודעה לעצמך": "You cannot message yourself",
  "השחקן לא נמצא": "That player was not found",
  "שלחת יותר מדי הודעות — המתן דקה":
    "You have sent too many messages — wait a minute",
  "יותר מדי הודעות בשיחה הזו — המתן דקה":
    "Too many messages in this thread — wait a minute",
  "כבר כתבת את זה": "You have already said that",
  "אין הרשאה": "Not permitted",
  "ההודעה כבר הוסרה": "That message is already hidden",
  "שלחת יותר מדי הודעות — נסה שוב בעוד כמה דקות":
    "You have sent too many messages — try again in a few minutes",
  "בחר עד {recipients} נמענים ומלא נושא (עד {title} תווים) ותוכן (עד {body} תווים)":
    "Pick up to {recipients} recipients and fill in a subject (up to {title} characters) and a body (up to {body} characters)",
  "לא נבחרו נמענים תקינים": "No valid recipients were selected",
  "שלחת הודעות ליותר מדי שחקנים בזמן קצר — נסה שוב בעוד כמה דקות":
    "You have written to too many players too quickly — try again in a few minutes",
  "שלחת לאחרונה כמה הודעות אל {name} — המתן לפני שתשלח שוב":
    "You have written to {name} several times recently — wait before writing again",
  "שלחת לאחרונה כמה הודעות אל השחקנים האלה — המתן לפני שתשלח שוב":
    "You have written to these players several times recently — wait before writing again",
  " (לא נשלחה אל {names} — יותר מדי הודעות אליהם לאחרונה)":
    " (not sent to {names} — too much mail to them recently)",
  "ההודעה נשלחה אל {name}": "Message sent to {name}",
  "ההודעה נשלחה אל {count} שחקנים": "Message sent to {count} players",

  /* the diamond shop and the store */
  "אין מספיק יהלומים": "You do not have enough diamonds",
  "הבונוס כבר בתקרה (+{max}%)": "The boost is already at its ceiling (+{max}%)",
  "בונוס תפוקה עלה ל־+{pct}% ל־24 שעות!":
    "Output boost raised to +{pct}% for 24 hours.",
  "ההנחה כבר פעילה": "The discount is already running",
  "הנחת {pct}% על נשק ושדרוגים פעילה ל־24 שעות!":
    "{pct}% off weapons and upgrades, for 24 hours.",
  "{shield} עדיין פעיל — ניתן לרכוש מחדש רק {minutes} דקות אחרי שיסתיים":
    "{shield} is still up — it can only be bought again {minutes} minutes after it ends",
  "{shield} בקירור — ניתן לחדש בעוד כ־{minutes} דקות":
    "{shield} is cooling down — renewable in about {minutes} minutes",
  "{shield} פעיל ל־{hours} השעות הבאות!": "{shield} is up for the next {hours} hours.",
  "כ־{count} שעות": "about {count} hours",
  "כ־{count} דקות": "about {count} minutes",
  "החבילה בקירור — זמינה בעוד {wait}": "The pack is cooling down — back in {wait}",
  "נוספו {turns} תורות!": "{turns} turns added.",
  "הקסם בקירור — זמין בעוד כ־{minutes} דקות":
    "The spell is cooling down — ready in about {minutes} minutes",
  "אין יתרה בבנק לצבירת ריבית": "There is no bank balance to pay interest on",
  "הריבית הנוכחית אפסית": "Your current interest rate is zero",
  "נצברה ריבית של {gold} זהב לבנק!": "{gold} gold in interest paid into the bank.",
  "הקסם זמין רק מעיר {min} ומעלה — אין עיר לוותר עליה":
    "The spell only works from city {min} upward — there is no city to give up",
  "דרושים {cost} יהלומים להטלת הקסם": "Casting it costs {cost} diamonds",
  " הקסם יהיה זמין שוב בעוד {hours} שעה.": " The spell is available again in {hours} hour.",
  "ירדת ל{city}.{tail}": "You have dropped to {city}.{tail}",
  "יש להתחבר כדי לרכוש": "You have to be signed in to buy",
  "החשבון חסום": "This account is suspended",
  "יש לאמת את כתובת האימייל לפני רכישה":
    "Your email address has to be verified before you can buy",
  "יותר מדי נסיונות רכישה. נסה שוב מאוחר יותר.":
    "Too many purchase attempts. Try again later.",
  "לא נמצאה אימפריה": "No empire found",
  "רכישות יהלומים ייפתחו ברגע שנחבר את מערכת התשלומים. תודה על הסבלנות!":
    "Diamond purchases open the moment the payment system is connected. Thanks for your patience.",
  "יש להשלים את התשלום בעמוד הסליקה. רענן את הדף ונסה שוב.":
    "The payment has to be completed on the checkout page. Refresh and try again.",
  "התשלום נכשל — לא חויבת. נסה שוב.":
    "The payment failed — you were not charged. Try again.",
  "רכישת בדיקה: נזקפו {diamonds} יהלומים.":
    "Test purchase: {diamonds} diamonds credited.",
  "נזקפו {diamonds} יהלומים לחשבונך!": "{diamonds} diamonds credited to your account.",
  "יש להזין שם פרטי ושם משפחה": "Enter a first name and a surname",
  "מספר טלפון נייד לא תקין (למשל 0501234567)":
    "That mobile number is not valid (for example 0501234567)",
  "אמצעי התשלום השתנה. רענן את הדף ונסה שוב.":
    "The payment method has changed. Refresh and try again.",
  "לא הצלחנו לפתוח את עמוד התשלום. נסה שוב.":
    "We could not open the payment page. Try again.",
  "התשלום לא הושלם. אם חויבת, פנה לתמיכה ונטפל בזה.":
    "The payment did not go through. If you were charged, contact support and we will sort it out.",

  /* the season pass */
  "כבר רכשת את מסלול הפרימיום לעונה הזו":
    "You have already bought the premium track this season",
  "מסלול הפרימיום נפתח לכל העונה! 👑":
    "The premium track is open for the whole season. 👑",
  "אין מספיק יהלומים (דרושים {cost})":
    "You do not have enough diamonds ({cost} needed)",
  "עדיין לא הגעת לאף דרגה במחזור הזה":
    "You have not reached a single tier this cycle yet",
  "אין תגמולים חדשים לאיסוף": "There are no new rewards to collect",
  "נאספו: {haul}": "Collected: {haul}",
  "{resource} {amount}": "{amount} {resource}",

  /* the city boss */
  "בוס העיר אינו זמין כרגע.": "The city ruler is not available right now.",
  "{boss} מת — הוא קם לתחייה ב־{time}.": "{boss} is dead — he rises again at {time}.",
  "נדרשות {turns} תורות כדי לצאת לקרב מול {boss}.":
    "Marching on {boss} costs {turns} turns.",
  "👑 {boss} הופל!": "👑 {boss} has fallen!",
  "💥 הצבא נשבר מול {boss}": "💥 Your army broke against {boss}",
  "⚔️ הקרב מול {boss} נסגר": "⚔️ The fight against {boss} is closed",
  "🩸 {boss} נפצע אבל שרד": "🩸 {boss} is wounded but survived",
  "{count} עבדים": "{count} slaves",
  "{amount} ניסיון לגיבור": "{amount} hero experience",
  "שלל: {spoils}.": "Spoils: {spoils}.",
  "בלי שלל.": "No spoils.",
  " אבדות: {count} חיילים.": " Losses: {count} soldiers.",
  " נותרו לו {hp} חיים.": " He has {hp} health left.",
  "{haul}{cost} הבוס יקום לתחייה בעוד שעה.":
    "{haul}{cost} He rises again in an hour.",
  "הקו נשבר והצבא נסוג מוקדם.{left} {haul}{cost}":
    "The line broke and your army pulled back early.{left} {haul}{cost}",
  "הקרב נסגר לפני שהוכרע. {haul}{cost}":
    "The fight closed before it was decided. {haul}{cost}",
  "{boss} עוד עומד.{left} {haul}{cost} צא שוב וסיים את העבודה.":
    "{boss} is still standing.{left} {haul}{cost} March again and finish the job.",
  "מצור על {boss}": "The siege of {boss}",

  /* the VIP pass */
  "{vip} כבר ברשותך": "You already hold {vip}",
  "דרושים {cost} יהלומים לרכישת {vip}": "{vip} costs {cost} diamonds",
  "{vip} שלך! הפעולות המהירות פתוחות מעכשיו מכל מסך במשחק.":
    "{vip} is yours. The quick actions are open from every screen in the game.",
  "שדרג ל־{vip}": "Upgrade to {vip}",
  "״{action}״ נפתח עם {vip}": "“{action}” opens with {vip}",
  "רכישה חד־פעמית שפותחת את כפתורי ״הכל״ שכבר קיימים במשחק. חיסכון בלחיצות בלבד — כל מה שהם עושים אפשר לעשות גם בלעדיהם, ידנית.":
    "A one-off purchase that unlocks the “do it to everything” buttons the game already has. It buys presses, nothing else — every one of those states is reachable by hand without it.",
  "רוכש...": "Buying…",
  "אין מספיק יהלומים? לרכישת יהלומים": "Short on diamonds? Buy some",

  /* profile, community, bans */
  "ערכת את התיאור יותר מדי פעמים — נסה שוב בעוד כמה דקות":
    "You have edited your blurb too many times — try again in a few minutes",
  "התיאור נמחק": "Your blurb has been cleared",
  "התיאור נשמר": "Your blurb has been saved",
  "ערוץ הקהילה עדיין לא נפתח": "The community channel is not open yet",
  "כבר אספת את המתנה הזו": "You have already collected this gift",
  "האימפריה לא נמצאה": "That empire was not found",
  "האימפריה הזו שייכת להנהלת המשחק — לא ניתן לתקוף או לרגל אותה.":
    "This empire belongs to the game's staff — it cannot be attacked or spied on.",
  "החשבון נחסם על ידי ההנהלה": "This account has been suspended by the staff",
  "החשבון נחסם על ידי ההנהלה עד {until}":
    "This account is suspended by the staff until {until}",

  /* cities */
  "{city} ({tier})": "{city} ({tier})",
  "{city} · {epithet}": "{city} · {epithet}",

  /* ------------------------------------------------------------------ */
  /* the verification email and the pages either side of it              */
  /* ------------------------------------------------------------------ */
  "אימות אימייל | קראלדור": "Verify your email | Kraldor",
  "אימות כתובת האימייל שלך בקראלדור": "Verify your email address for Kraldor",
  "שלום {name},\\n\\nכדי להפעיל את החשבון שלך בקראלדור, פתח את הקישור:\\n{link}\\n\\nהקישור תקף ל-24 שעות. אם לא נרשמת, אפשר להתעלם מההודעה.":
    "Hello {name},\\n\\nTo activate your Kraldor account, open this link:\\n{link}\\n\\nThe link is good for 24 hours. If you did not sign up, you can ignore this message.",
  "ברוך הבא לקראלדור, {name}": "Welcome to Kraldor, {name}",
  "כדי להפעיל את החשבון ולהתחיל לשחק, אשר את כתובת האימייל שלך:":
    "To activate your account and start playing, confirm your email address:",
  "אימות האימייל": "Verify email",
  "הקישור תקף ל-24 שעות. אם לא נרשמת לקראלדור, אפשר להתעלם מההודעה.":
    "The link is good for 24 hours. If you did not sign up for Kraldor, you can ignore this message.",
  "האימייל אומת": "Email verified",
  "החשבון שלך פעיל. אפשר להיכנס ולהתחיל לבנות.":
    "Your account is live. Sign in and start building.",
  "כניסה למשחק": "Enter the game",
  "האימות נכשל": "Verification failed",
  "אמת את האימייל שלך": "Verify your email",
  "שלחנו קישור אימות אל": "We have sent a verification link to",
  ". פתח אותו כדי להפעיל את החשבון. הקישור תקף ל-24 שעות.":
    ". Open it to activate your account. The link is good for 24 hours.",
  "לא רואה את המייל? בדוק בתיקיית הספאם.":
    "Cannot see it? Check your spam folder.",
  "אם אינך מחובר,": "If you are not signed in,",
  "התחבר תחילה": "sign in first",
  "ואז בקש קישור חדש.": "and then ask for a new link.",
  "הקמת אימפריה | קראלדור": "Found your empire | Kraldor",
  "הרשמה | קראלדור": "Sign up | Kraldor",

  /* ------------------------------------------------------------------ */
  /* screens: army, achievements, settings, production, storage, reports */
  /* ------------------------------------------------------------------ */
  "צבא | קראלדור": "Army | Kraldor",
  "אימון מגויסים": "Training Recruits",
  "אזרחים פנויים": "Citizens free",
  "הישגים | KRALDOR": "Achievements | KRALDOR",
  "היכל הפרסים": "The Trophy Hall",
  "פרסים מחכים על המדף": "rewards waiting on the shelf",
  "הישגים בהיכל — אין מה לאסוף כרגע":
    "achievements in the hall — nothing to collect right now",
  "הגדרות | קראלדור": "Settings | Kraldor",
  "שם האימפריה": "Empire name",
  "פרטי חשבון": "Account details",
  "שם": "Name",
  "האימפריה נוסדה": "Empire founded",
  "התנתקות מהחשבון במכשיר הזה. ההתקדמות שלך נשמרת.":
    "Sign out of this device. Your progress is kept.",
  "התנתק מהמשחק": "Sign out",
  "ייצור | קראלדור": "Production | Kraldor",
  'סה"כ עבדי מכרות': "Mine slaves in total",
  "עבדי מכרות מוצבים": "Slaves assigned",
  "עבדי מכרות פנויים": "Slaves free",
  "מפעלים ותעשייה": "Works and Industry",
  "מחסנים | קראלדור": "Warehouses | Kraldor",
  "משאבים מאוחסנים": "Resources stored",
  "קיבולת כוללת": "Total capacity",
  "ניצול כולל": "Overall use",
  "מערך המחסנים": "The Warehouse Yard",
  "ניצול כולל של המערך": "Overall use of the yard",
  "המחסן מגן רק על משאבים שהפקדת אליו. משאבים זמינים אינם מוגנים ויכולים להיגנב בתקיפה.":
    "A warehouse only protects what you put into it. Available resources are unprotected and can be stolen in an attack.",
  "דוחות | קראלדור": "Reports | Kraldor",
  "שולחן המבצעים": "The Dispatch Desk",
  "דוחות קרב": "Battle reports",
  "משימות ריגול": "Spy missions",
  "מאז ביקורך האחרון": "Since your last visit",
  "יהלומים | KRALDOR": "Diamonds | KRALDOR",
  "הוצא יהלומים על האצות ייצור, מגני תקיפה, חבילות תורות וקסמים — כל רכישה משפיעה מיידית על האימפריה.":
    "Spend diamonds on output boosts, raid shields, turn packs and spells — every purchase lands on your empire at once.",
  "כל הפריטים | KRALDOR": "All items | KRALDOR",
  "כל הפריטים": "All items",
  "חזרה לגיבור": "Back to the hero",
  "קרב בוס | KRALDOR": "Boss fight | KRALDOR",
  "חזרה לדירוג": "Back to the rankings",
  "סגור": "Close",
  "סגירה": "Close",
};
