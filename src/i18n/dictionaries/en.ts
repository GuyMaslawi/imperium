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
  "הכל": "All",
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
  "שלום {name},\n\nכדי להפעיל את החשבון שלך בקראלדור, פתח את הקישור:\n{link}\n\nהקישור תקף ל-24 שעות. אם לא נרשמת, אפשר להתעלם מההודעה.":
    "Hello {name},\n\nTo activate your Kraldor account, open this link:\n{link}\n\nThe link is good for 24 hours. If you did not sign up, you can ignore this message.",
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

  /* ------------------------------------------------------------------ */
  /* the expedition board — מסעות הגיבור                                 */
  /* ------------------------------------------------------------------ */
  "הגיבור יוצא למסע אחד בכל פעם. כל עיר שאתה מקים פותחת מסע ארוך יותר — והשלל של כל המסעות גדל עם מספר הערים שלך ועם התקדמות העונה.":
    "Your hero walks one road at a time. Every city you found opens a longer one — and the haul of every expedition grows with the number of cities you hold and with the season's progress.",
  "נפתחו {open} מתוך {total}": "{open} of {total} unlocked",
  "אף אחד לא יודע מה יחזור מהדרך.": "Nobody knows what comes back down the road.",
  "כל מסע מגלגל את מזלו שלו — לפעמים הגיבור חוזר חבול ועם מעט, ולפעמים נגררת אחריו עגלה שלמה. מה שכן בטוח: השלל גדל עם מספר הערים שלך ועם התקדמות העונה, וכל מסע משלם אותו ממוצע":
    "Every run rolls its own fortune — sometimes the hero limps home with scraps, sometimes a whole wagon follows him in. What is certain: the haul grows with the number of cities you hold and with the season's progress, and every expedition pays the same average",
  "לכל שעה": "per hour",
  ". המסעות הארוכים קונים מחיר תורות נמוך יותר לשעה וסיכויי שלל גבוהים בהרבה; הקצרים קונים חפצים לשעה ואת החופש להגיב. הגיבור ממשיך להעניק את כל הבונוסים שלו גם בזמן שהוא בדרכים.":
    ". The long roads buy a lower turn price per hour and far better loot odds; the short ones buy items per hour and the freedom to react. The hero keeps granting every one of his bonuses while he is away.",
  "חזר!": "Home!",
  "לחץ כדי לראות מה הוא הביא — השלל, המזל שליווה אותו, וכל מה שנפל בדרך.":
    "Tap to see what he brought — the haul, the fortune that rode with him, and everything picked up along the way.",
  "השלל נקבע ברגע שהוא יצא לדרך, אבל אף אחד בעיר עוד לא יודע מה יש בשק. הוא ייספר כשיחזור.":
    "The haul was settled the moment he left, but nobody in the city knows yet what is in the sack. It gets counted when he walks back in.",
  "אוסף…": "Collecting…",
  "קבל את פני הגיבור ואסוף את השלל": "Welcome the hero home and take the haul",
  "הגיבור בדרכים…": "The hero is on the road…",
  "הגיבור חזר מ”{quest}”": "The hero is back from “{quest}”",
  "סגור את סיכום המסע": "Dismiss the expedition summary",
  "הגיבור עלה {count} דרגות!": "The hero gained {count} levels!",
  "הגיבור עלה דרגה!": "The hero gained a level!",
  "נמצא בדרך:": "Found on the road:",
  "מחכה בתרמיל": "waiting in the pack",
  "נפתח עם העיר ה-{tier}": "Unlocks with city {tier}",
  "הגיבור כבר במסע": "The hero is already away",
  "חסרות {turns} תורות": "{turns} turns short",
  "{quest} — מסע נעול": "{quest} — expedition locked",
  "השלל של המסע הזה לא ידוע מראש: כל יציאה מגלגלת את מזלה שלה — לפעמים מעט, לפעמים עגלה שלמה. הגודל הממוצע נגזר ממספר הערים שלך ומיום העונה, ואותו לכל שעת מסע בכל הדרגות.":
    "This expedition's haul is not known in advance: every departure rolls its own fortune — sometimes scraps, sometimes a full wagon. The average size follows the number of cities you hold and the day of the season, and it is the same per hour on the road at every rung.",
  "סיכוי לחפץ גיבור בסיום המסע: {item}% · סיכוי לשיקוי: {potion}% — שתי הגרלות נפרדות, ומסע יכול להחזיר את שניהם.":
    "Chance of a hero item at the end of the road: {item}% · chance of a potion: {potion}% — two separate draws, and one expedition can bring back both.",
  "עלות שליחה: {cost} תורות — {perHour} לכל שעת מסע.":
    "Cost to send: {cost} turns — {perHour} per hour on the road.",
  "שלח למסע": "Send out",
  "מחכה בשער": "waiting at the gate",
  "שלל לא ידוע": "haul unknown",
  "ניסיון לגיבור — הדבר היחיד במסע שידוע מראש: הוא נקבע לפי דרגת המסע בלבד ולא מושפע ממזל.":
    "Hero experience — the one thing about an expedition that is known in advance: it follows the rung alone and no roll of fortune touches it.",
  "מסעות הגיבור": "The Hero's Expeditions",
  "הגיבור מת": "Your hero is dead",

  /* ------------------------------------------------------------------ */
  /* founding the next city                                             */
  /* ------------------------------------------------------------------ */
  "עליית עיר": "Rise a City",
  "(מתוך {max} ערים)": "(of {max} cities)",
  "הגעת ל־": "You have reached ",
  "— העיר האחרונה. תפוקת המכרות ורמות קבלת האזרחים שלך במקסימום.":
    "— the last city. Your mine output and your citizen-intake levels are both maxed out.",
  "עליית עיר מכפילה את תפוקת המכרות ל־": "Rising a city multiplies mine output to ",
  "ופותחת עוד {levels} רמות לשדרוג קבלת האזרחים.":
    "and opens {levels} more levels of the citizen-intake upgrade.",
  "דרישות (אינן נצרכות):": "Requirements (nothing is spent):",
  "גיבור רמה {required} (כעת {level})": "Level {required} hero (yours is {level})",
  "{count} חיילים בצבא": "{count} soldiers in the army",
  "עלות עלייה (נצרכת):": "Cost to rise (spent):",
  "אין מספיק מהמשאב הזה": "Not enough of this resource",
  "מעלה עיר...": "Rising…",
  "עלה עיר": "Rise a city",
  "ערים · תפוקת מכרות": "cities · mine output",
  "הממלכה שלך — {cities} ערים מתוך {max}, ומושבך ב{city}":
    "Your realm — {cities} of {max} cities, seated in {city}",
  "{city} — ריגול ותקיפה אפשריים רק בתוך העיר שלך.":
    "{city} — you can only spy on and attack empires inside your own city.",

  /* ------------------------------------------------------------------ */
  /* the city boss, as it sits above the ladder                          */
  /* ------------------------------------------------------------------ */
  "{boss} מת — הוא קם לתחייה בעוד רגע": "{boss} is dead — he rises again shortly",
  "הקרב הנוכחי עוד רץ": "The current battle is still running",
  "חסרות לך {turns} תורות": "You are {turns} turns short",
  "אין לך צבא — אמן חיילים קודם": "You have no army — train soldiers first",
  "הפלת את {boss} {count} פעמים בעיר הזו.":
    "You have brought {boss} down {count} times in this city.",
  "{boss} שולט ב{city}.": "{boss} rules {city}.",
  "עיר {city}": "{city}",
  "{boss} הופל": "{boss} has fallen",
  "— קם לתחייה בעוד": "— rises again in",
  "חיי הבוס": "Boss health",
  "פצוע ב־{pct}% מתקיפה אחת — הפצעים נשארים עד שהוא נופל":
    "Wounded {pct}% by one assault — the wounds stay until he falls",
  "פצוע ב־{pct}% מ־{sorties} תקיפות — הפצעים נשארים עד שהוא נופל":
    "Wounded {pct}% across {sorties} assaults — the wounds stay until he falls",
  "תקיפה אחת תוריד לו": "One assault takes off",
  "ותשלם לך בערך": "and pays you roughly",
  "ותעלה לך": "and costs you",
  "{boss} עדיין חזק ממך.": "{boss} is still stronger than you.",
  "בקצב הזה צריך כ־{sorties} תקיפות כדי להפיל אותו, וכל אחת עולה {turns} תורות":
    "At this rate it takes about {sorties} assaults to bring him down, and each one costs {turns} turns",
  " ובערך {soldiers} חיילים": " and roughly {soldiers} soldiers",
  ". השלל הגדול ({share}% ממנו + הציוד) משולם רק בהפלה — עדיף לגדל צבא ולהעלות את הגיבור, ואז לתקוף.":
    ". The big haul ({share}% of it, plus the gear) is only paid on the kill — grow the army and level the hero first, then march.",
  "הקרב רץ — צפה בו": "The battle is running — watch it",
  "תקיפה עולה {cost} תורות ורצה כדקה. הצבא נלחם לבד {rounds} סבבים — תקבל הודעה עם השלל כשהקרב נגמר, גם אם עברת לדף אחר.":
    "An assault costs {cost} turns and runs about a minute. The army fights {rounds} rounds on its own — you get a message with the haul when it ends, even if you have moved on to another page.",
  "שלל, איך הקרב עובד, וסיפור הרקע": "Spoils, how the fight works, and the lore",
  "מפילי {boss}": "Those who felled {boss}",
  "איך הקרב עובד": "How the fight works",
  "לוחצים תקיפה פעם אחת. הצבא יוצא ל־{rounds} סבבים לאורך כדקה, ובכל סבב הקצינים מנסים לקרוא את המהלך של {boss} ולענות עליו. קריאה נכונה מכפילה את הנזק":
    "You press attack once. The army marches out for {rounds} rounds over about a minute, and in each one the officers try to read {boss}'s move and answer it. A correct read doubles the damage",
  " ומבטלת כמעט את האבדות": " and all but cancels the losses",
  "; קריאה שגויה עושה את ההפוך. הסיכוי לקרוא נכון תלוי":
    "; a wrong read does the opposite. The odds of reading right depend on",
  "ברמת הגיבור שלך": "your hero's level",
  "כרגע": "right now",
  "אבדות של {pct}% מבריחות את הצבא באמצע הקרב.":
    "Losses of {pct}% rout the army mid-battle.",
  "הקרב לא עולה לך אף חייל — הצבא חוזר שלם תמיד, והמחיר היחיד הוא התורות.":
    "The fight costs you no soldiers at all — the army always comes home whole, and the only price is the turns.",
  "תקיפה אחת שלך מורידה בממוצע {damage} חיים —":
    "One of your assaults takes an average of {damage} health off him —",
  "אמן צבא כדי להתחיל": "train an army to get started",
  "תקיפה אחת להפלה": "one assault to bring him down",
  "כ־{sorties} תקיפות להפלה": "about {sorties} assaults to bring him down",
  ". כוח הבוס {bossPower} מול כוח התקיפה שלך {myPower}.":
    ". His power is {bossPower} against your attack power of {myPower}.",
  "איך מגדילים את הסיכויים": "How to improve your odds",
  "כדי לפגוע בו יותר — כוח תקיפה": "To hit him harder — attack power",
  "(חיילים": "(soldiers",
  "+ נשקי תקיפה": "+ attack weapons",
  ") × גיבור": ") × hero",
  "× גילדה": "× guild",
  "+ סיוע": "+ aid",
  "הנזק בכל סבב הוא אחוז מהכוח הזה — כל 100 חיילים מוסיפים 1,000 כוח, ונשקי תקיפה מוסיפים כוח":
    "Each round's damage is a percentage of that power — every 100 soldiers add 1,000 power, and attack weapons add power",
  " בלי לעלות בדם": " without costing blood",
  " בלי לאמן אף חייל": " without training a single soldier",
  ". שיקוי כוח, באפ גילדה וציוד גיבור נספרים גם הם.":
    ". A power potion, the guild buff and hero gear all count too.",
  "כדי לספוג פחות — הגיבור": "To take less — the hero",
  "כדי לפגוע בכל סבב — הגיבור": "To land every round — the hero",
  "אבדות נקבעות רק לפי אם הקצינים קראו את המהלך נכון. גיבור רמה":
    "Losses come down to one thing: whether the officers read the move right. A level",
  "כמה נזק ייצא מהסבב נקבע לפי אם הקצינים קראו את המהלך נכון. גיבור רמה":
    "How much damage a round lands comes down to whether the officers read the move right. A level",
  "קורא נכון": "hero reads",
  "מהמהלכים": "of the moves correctly",
  ", וסבב שנקרא נכון עולה כשליש מהדם של סבב שגוי — ומכפיל את הנזק.":
    ", and a round read right costs about a third of the blood of one read wrong — and doubles the damage.",
  ", וסבב שנקרא נכון מכפיל את הנזק מול סבב שנקרא לא נכון.":
    ", and a round read right does double the damage of one read wrong.",
  "הגיבור שלך מת — הקצינים מנחשים ואין זעם":
    "Your hero is dead — the officers are guessing and there is no fury",
  ", והאבדות כמעט מוכפלות": ", and the losses nearly double",
  ". החייה אותו לפני שתתקוף.": ". Raise him before you march.",
  "כל רמה מוסיפה לסיכוי הקריאה (עד {max}%) ומחזקת את מכת הזעם. גיבור מת מאבד את שניהם.":
    "Every level adds to the read chance (up to {max}%) and sharpens the fury blow. A dead hero loses both.",
  "שלל מלא על הבוס הזה": "The full haul on this boss",
  "שבויים ששוחררו ממכלאות הבוס — מצטרפים למאגר עבדי המכרות הפנוי שלך.":
    "Captives freed from the boss's pens — they join your pool of free mine slaves.",
  "עבדים": "slaves",
  "הבוס תמיד מפיל ציוד גיבור — ולעולם לא ציוד פשוט. דירוג קרב מושלם (S) מעלה את הרצפה בדרגה.":
    "The boss always drops hero gear — and never common gear. A perfect battle grade (S) raises the floor by one rarity.",
  "ציוד מובטח בהפלה": "Gear guaranteed on the kill",
  "{chip}% מהשלל משולם לפי הנזק שאתה מספיק לגרום — גם בתקיפה שלא הפילה אותו. השאר ({kill}%) הוא אוצר ההפלה, שגדל עד ×{grade} בקרב מושלם. השלל גדל עם התקדמות העונה ועם מספר הערים שלך.":
    "{chip}% of the haul is paid out for the damage you manage to land — even on an assault that did not finish him. The rest ({kill}%) is the kill treasure, which grows up to ×{grade} in a perfect battle. The haul grows with the season's progress and with the number of cities you hold.",

  /* ------------------------------------------------------------------ */
  /* the diamond shop                                                    */
  /* ------------------------------------------------------------------ */
  "בונוס תפוקת משאבים": "Resource output boost",
  "עד +{max}% לכל משאב · 24ש׳": "up to +{max}% per resource · 24h",
  "תוספת {resource}": "{resource} boost",
  "כל רכישה +{step}% לתפוקה · עד +{max}% · 24ש׳":
    "each purchase is +{step}% output · up to +{max}% · 24h",
  "בתקרה (+{max}%)": "At the cap (+{max}%)",
  "✨ פעיל עד {when}": "✨ Live until {when}",
  "🛡️ מגן עד {when}": "🛡️ Shielded until {when}",
  "🛡️ פעיל עד {when}": "🛡️ Live until {when}",
  "הנחת חנות {pct}%": "{pct}% shop discount",
  "{pct}% הנחה על רכישת נשק וכל השדרוגים (מכרות, מחסנים, שדרוגי אימפריה) למשך 24 שעות.":
    "{pct}% off weapons and every upgrade (mines, warehouses, empire upgrades) for 24 hours.",
  "הפעל הנחה": "Start the discount",
  "מגני תקיפה": "Raid shields",
  "24 או 48 שעות · חידוש רק {minutes} דקות אחרי שנגמר":
    "24 or 48 hours · renewable only {minutes} minutes after it ends",
  "פעיל": "Live",
  "התקיפה עצמה עדיין מתרחשת. לא ניתן לחדש בזמן שהמגן פעיל — רק {minutes} דקות אחרי שהוא נגמר.":
    "The attack itself still happens. A running shield cannot be renewed — only {minutes} minutes after it ends.",
  "חלון חשוף · ניתן לחדש ב־{when}": "Exposed window · renewable at {when}",
  "{hours}ש׳": "{hours}h",
  "חבילות תורות": "Turn packs",
  "לכל חבילה קירור משלה": "each pack has its own cooldown",
  "{hours} שעות": "{hours} hours",
  "{minutes} דקות": "{minutes} minutes",
  "זמין אחת ל־{cooldown}": "Available once every {cooldown}",
  "זמין ב־{when}": "Available at {when}",
  "קסמים ושירותים": "Spells and services",
  "איפוס נקודות גיבור": "Hero point reset",
  "משחרר את כל הנקודות שהקצית (התקפה/הגנה/משאבים) חזרה לנקודות פנויות, בלי לגעת ברמה. פעם אחת בעונה.":
    "Frees every point you have allocated (attack/defence/resources) back into unspent points, without touching your level. Once per season.",
  "כבר נוצל העונה": "Already used this season",
  "מאפס...": "Resetting…",
  "אפס": "Reset",
  "קסם ריבית בנק": "Bank interest spell",
  "צובר מיידית תשלום ריבית אחד לבנק, לפי הרמה שלך. ניתן להטיל אחת ל־24 שעות.":
    "Credits one bank interest payment at once, at your level. Castable once every 24 hours.",
  "בקירור · זמין ב־{when}": "Cooling down · available at {when}",
  "מטיל...": "Casting…",
  "הטל": "Cast",
  "קסם ירידת עיר": "City descent spell",
  "מוריד אותך עיר אחת בלבד — מעיר {from} ל{to}. אין החזר משאבים, והדרך חזרה היא ייסוד העיר מחדש במחיר המלא. ניתן להטיל אחת ל־{hours} שעה.":
    "Takes you down exactly one city — from {from} to {to}. Nothing is refunded, and the only way back is founding the city again at full price. Castable once every {hours} hour.",
  "זמין מעיר {min} ומעלה — אין לך עיר לוותר עליה":
    "Available from city {min} up — you have no city to give up",
  "רד לעיר {target}": "Drop to city {target}",

  /* ------------------------------------------------------------------ */
  /* the diamond store — real-money packages and the checkout            */
  /* ------------------------------------------------------------------ */
  "מבצע לזמן מוגבל!": "Limited-time offer!",
  "כל חבילות היהלומים ב־{pct}% הנחה — מחכה לך ברגע שהחנות תיפתח.":
    "Every diamond pack is {pct}% off — waiting for you the moment the store opens.",
  "כל חבילות היהלומים ב־{pct}% הנחה. הזמן מוגבל — נצל את זה עכשיו.":
    "Every diamond pack is {pct}% off. The clock is running — take it now.",
  "החנות תיפתח ברגע שמערכת התשלומים תסיים את ההרצה. עד אז אפשר להרוויח יהלומים במשחק עצמו.":
    "The store opens as soon as the payment system finishes its trial run. Until then you can earn diamonds in the game itself.",
  "התשלומים מעובדים בצורה מאובטחת. היהלומים נזקפים לחשבונך מיד לאחר הרכישה.":
    "Payments are processed securely. Diamonds land in your account the moment the purchase completes.",
  "מערכת התשלומים בהרצה אחרונה. היהלומים נזקפים אוטומטית לחשבונך מיד עם סיום הרכישה.":
    "The payment system is in its final trial run. Diamonds are credited to your account automatically the moment the purchase completes.",
  "ערך": "value",
  "בונוס": "bonus",
  "רכישה מיידית": "Buy now",
  "רכישה": "Buy",
  "בקרוב": "Soon",
  "אישור רכישה": "Confirm purchase",
  "מעביר לתשלום מאובטח…": "Handing over to secure payment…",
  "עוד רגע תועבר לעמוד הסליקה. אל תסגור את החלון.":
    "You are about to be sent to the payment page. Do not close this window.",
  "התשלום בוצע!": "Payment complete!",
  "נזקפו {count} יהלומים לחשבונך.": "{count} diamonds have been credited to your account.",
  "מעולה!": "Excellent!",
  "התשלום בקרוב!": "Payment is coming soon!",
  "הבנתי": "Got it",
  "כולל בונוס": "Bonus included",
  "לתשלום": "To pay",
  "פרטים אלה נדרשים על ידי חברת הסליקה ולהפקת הקבלה.":
    "The payment provider requires these details, and so does the receipt.",
  "שם מלא": "Full name",
  "ישראל ישראלי": "Jane Doe",
  "טלפון נייד": "Mobile phone",
  "פותח עמוד תשלום...": "Opening the payment page…",
  "מעבד תשלום...": "Processing payment…",
  "המשך לתשלום {price}": "Continue to pay {price}",
  "שלם {price}": "Pay {price}",
  "ביטול": "Cancel",
  "בהשלמת הרכישה אתה מאשר את": "By completing this purchase you accept the",
  "תנאי השימוש": "Terms of Service",
  "ואת": "and the",
  "מדיניות הביטולים": "Refund Policy",
  "מצב הדגמה — לא מתבצע חיוב אמיתי עד לחיבור ספק התשלומים.":
    "Demo mode — no real charge is made until the payment provider is connected.",

  /* ------------------------------------------------------------------ */
  /* the power cards on the base, and the hero's combined yield          */
  /* ------------------------------------------------------------------ */
  "כוח האימפריה": "Empire power",
  "כוח התקפה": "Attack power",
  "כוח הגנה": "Defence power",
  "כוח מודיעין": "Intelligence power",
  "כוח כללי": "Overall power",
  "מהרכב הכוח": "What makes it up",
  "{label} (+{pct}%)": "{label} (+{pct}%)",
  "נשקי התקפה": "Attack weapons",
  "נשקי הגנה": "Defence weapons",
  "נשקי ריגול": "Spy weapons",
  "כולל בונוסים פעילים (גיבור / קסם / עזרת ברית).":
    "Includes every live bonus (hero / spell / guild aid).",
  "כוח ההגנה בפועל בקרב, כולל בונוס מגן ובונוסים פעילים.":
    "Your real defence power in battle, defender's bonus and live bonuses included.",
  "בקרב הגנה מתקבל בונוס הגנה של 20%.": "Defending in battle grants a 20% defence bonus.",
  "שדרוג מודיעין מכפיל אותו — ריגול מצליח כשהוא גדול מזה של היעד.":
    "The intelligence upgrade multiplies it — a spy run succeeds when it beats the target's.",
  "התקפה + הגנה + מודיעין": "attack + defence + intelligence",
  "ניהול נשקים": "Manage weapons",
  "ניהול נשקי ריגול": "Manage spy weapons",
  "אימון צבא": "Train the army",
  "אימון מרגלים": "Train spies",
  "סך הכל מהגיבור": "Everything the hero pays",
  "מה שאתה מקבל בפועל מהנקודות והחפצים יחד. שורות מודגשות פעילות; שורות עמומות ממתינות לחפץ מתאים.":
    "What the points and the gear actually pay you, together. Bright rows are live; dim ones are waiting on the right item.",
  "בונוסי קרב · באחוזים": "Battle bonuses · as percentages",
  "תשואה קבועה מחפצים · בכמויות": "Flat yield from gear · as amounts",
  "תפוקת משאבים · אחוזים + כמות": "Resource output · percentage + amount",
  "נקודות": "Points",
  "חפצים": "Gear",
  "דמות": "Class",
  "מנקודות התקפה ומחפצים לבושים": "from attack points and equipped gear",
  "מנקודות הגנה ומחפצים לבושים": "from defence points and equipped gear",
  "מחפצי ריגול לבושים בלבד": "from equipped spy gear only",
  "נוסף בכל עדכון יומי": "added on every daily update",
  "האחוזים מכפילים את תפוקת המכרות; הכמות הקבועה נוספת מעליה בכל עדכון רגיל.":
    "The percentages multiply mine output; the flat amount is added on top of it on every regular update.",
  "נקודות +{pct}% — מכפיל תפוקת מכרות": "Points +{pct}% — multiplies mine output",
  "דמות +{pct}% — יתרון הסוחר": "Class +{pct}% — the Merchant's edge",
  "חרב ומגן +{pct}% — מכפיל תפוקת מכרות":
    "Sword and shield +{pct}% — multiplies mine output",
  "כמות קבועה +{flat} —": "Flat amount +{flat} —",
  "— בכל עדכון רגיל": "— on every regular update",
  "מפרי שטן, מכנסיים או נעליים — המשאבים לפי דרגת החפץ":
    "from a devil's fruit, trousers or boots — which resources depends on the item's rung",

  /* ------------------------------------------------------------------ */
  /* the chat dock                                                       */
  /* ------------------------------------------------------------------ */
  "פתיחת הצ׳אט": "Open chat",
  "סגירת הצ׳אט": "Close chat",
  "צ׳אט": "Chat",
  "חדר כללי": "Public room",
  "שיחות פרטיות": "Private chats",
  "שיחות": "Conversations",
  "שחקנים": "Players",
  "({count} מחוברים)": "({count} online)",
  "דבר אל האימפריה…": "Speak to the empire…",
  "הודעה אל {name}…": "Message {name}…",
  "שלח": "Send",
  "אין עדיין הודעות בשיחה הזו — כתוב ראשון.":
    "No messages in this conversation yet — write the first one.",
  "החדר שקט. תהיה הראשון שמדבר.": "The room is quiet. Be the first to speak.",
  "פתיחת שיחה פרטית": "Open a private chat",
  "צוות": "Staff",
  "פרופיל": "Profile",
  "הסתרת ההודעה": "Hide this message",
  "חיפוש שחקן לשיחה חדשה…": "Search for a player to talk to…",
  "מחפש…": "Searching…",
  "לא נמצא שחקן בשם הזה": "No player by that name",
  "אין עדיין שחקנים אחרים במשחק.": "There are no other players in the game yet.",
  "כל השחקנים כבר ברשימת השיחות שלך.":
    "Every player is already in your conversation list.",
  "חזרה לרשימת השיחות": "Back to the conversation list",
  "מחובר": "online",
  "הקהילה נפגשת בדיסקורד — הצטרפו": "The community meets on Discord — come along",

  /* ------------------------------------------------------------------ */
  /* דרך התהילה — the season pass ladder                                 */
  /* ------------------------------------------------------------------ */
  "דרך התהילה": "The Road of Glory",
  "יום {day}": "Day {day}",
  "פרימיום": "Premium",
  "פרימיום פעיל": "Premium is live",
  "שדרג": "Upgrade",
  "שדרג עכשיו": "Upgrade now",
  "חינמי": "Free",
  "מסלול חינמי": "the free track",
  "מסלול פרימיום": "the premium track",
  "מסלול פרימיום (בנוסף)": "Premium track (on top)",
  "מסלול פרימיום — נעול": "Premium track — locked",
  "דרגות מוכנות לאיסוף": "tiers ready to collect",
  "סגור את דרך התהילה": "Close the Road of Glory",
  "מתאפס בעדכון היומי הבא בעוד": "Resets at the next daily update, in",
  "— וכל יום שעובר בעונה מגדיל את התגמולים":
    "— and every day of the season raises the rewards",
  "מתחדש עכשיו…": "refreshing now…",
  "{count} דרגות": "{count} tiers",
  "מחכה לך לאיסוף": "waiting for you",
  "אסוף את השלל": "Take the haul",
  "אסוף את השלל החינמי": "Take the free haul",
  "הרכישה נכשלה": "The purchase failed",
  "כל פעולה במשחק מזכה בניסיון — תקוף או בנה כדי לפתוח את הדרגה הראשונה":
    "Every action in the game earns experience — attack or build to open the first tier",
  "אספת כל מה שנפתח — עלה דרגה כדי לפתוח עוד":
    "You have taken everything that is open — climb a tier to open more",
  "השלל נאסף": "Haul collected",
  "סגור את סיכום השלל": "Dismiss the haul summary",
  "דרגה נוכחית": "Current tier",
  "מתוך {total}": "of {total}",
  "{xp}/{max} ניסיון · {pct}% מהסולם": "{xp}/{max} XP · {pct}% of the ladder",
  "כל הדרגות נפתחו": "Every tier is open",
  "עוד {xp} ניסיון לדרגה {tier}": "{xp} XP to tier {tier}",
  "דרגה {level} מתוך {total} — {pct}% מהסולם":
    "Tier {level} of {total} — {pct}% of the ladder",
  "{claimed}/{total} נאספו": "{claimed}/{total} collected",
  "דרגות": "Tiers",
  "אתה כאן": "you are here",
  "מוכן": "READY",
  "נעול מאחורי פרימיום": "locked behind premium",
  "עדיין לא הושג": "not reached yet",
  "דרגה {tier}, {track}: {reward} — {status}":
    "Tier {tier}, {track}: {reward} — {status}",
  "פתח את הצד הזהוב": "Open the golden side",
  "פי {multiplier} שלל בכל אחת מ־{tiers} הדרגות · תשלום אחד לכל העונה":
    "{multiplier}× the haul on every one of the {tiers} tiers · one payment for the whole season",
  "זה מה שהמסלול הזהוב מוסיף בסבב אחד — ויש שני סבבים ביום":
    "that is what the golden track adds in one cycle — and there are two cycles a day",
  "יש לך {count}": "You have {count}",
  "· נשאר פתוח עד סוף העונה": "· stays open to the end of the season",
  "אין מספיק יהלומים ({have}/{price}": "Not enough diamonds ({have}/{price}",
  "סבב מלא — כל {tiers} הדרגות": "A full cycle — all {tiers} tiers",
  "חזרה לדרגה שלך ({tier})": "Back to your tier ({tier})",
  "וואו! ניקית הכול 🔥": "Wow — you cleared the lot 🔥",
  "סיימת את כל {total} הדרגות של דרך התהילה — ביום {day} של העונה. משוגע.":
    "You finished all {total} tiers of the Road of Glory — on day {day} of the season. Ridiculous.",
  "כל השלל של הסבב הזה": "Everything this cycle paid",
  "סבב חדש נפתח בעדכון היומי הבא, בעוד": "A new cycle opens at the next daily update, in",
  "הסולם יתמלא מחדש — וכל יום שעובר בעונה מגדיל את התגמולים בכל דרגה":
    "The ladder refills — and every day of the season raises the reward on every tier",
  "זה מה שהצד הזהוב היה מוסיף על השלל הזה":
    "this is what the golden side would have added to that haul",
  "יאללה, בחזרה לקרב": "Right — back to the fight",

  /* ------------------------------------------------------------------ */
  /* the mini-games: the pill, the board and the winners' rail           */
  /* ------------------------------------------------------------------ */
  "(אתה)": "(you)",
  "🏆 זכה": "🏆 won",
  "✅ פתר": "✅ solved",
  "💀 נגמרו": "💀 out",
  "⏳ משחק": "⏳ playing",
  "כוסות": "Cups",
  "כוס {n}": "Cup {n}",
  "כוס {n} — הכדור כאן!": "Cup {n} — the ball is here!",
  "כוס {n} — ריקה": "Cup {n} — empty",
  "ספרה נכונה במקום הנכון": "right digit, right slot",
  "ספרה נכונה במקום אחר": "right digit, wrong slot",
  "לא בקוד": "not in the code",
  "הכספת פתוחה 🎉": "The vault is open 🎉",
  "הזן קוד בן {digits} ספרות": "Enter a {digits}-digit code",
  "ספרה {n}": "Digit {n}",
  "🔓 נסה לפרוץ": "🔓 Try the code",
  "🏆 כבר זכו": "🏆 Already won",
  "פרס:": "Prize:",
  "זוכים": "Winners",
  "משתתפים": "Players",
  "נותר": "Left",
  "🎉 ניצחת!": "🎉 You won!",
  "✅ פתרת נכון": "✅ Solved it",
  "הפרס נוסף לאימפריה שלך: {prize}": "The prize is in your empire: {prize}",
  "כל הפרסים כבר חולקו — אבל כל הכבוד!":
    "Every prize is already claimed — but well played.",
  "😔 נגמרו הניסיונות": "😔 Out of attempts",
  "יצאת מהמשחק, אבל הוא עדיין רץ — סגור את החלון והמשך לשחק; הכפתור למעלה יעדכן אותך מי זכה.":
    "You are out of this one, but it is still running — close the window and carry on; the pill above will tell you who wins.",
  "נותרו {count} ניסיונות": "{count} attempts left",
  "המשחק ממשיך בלעדיך — עקוב אחרי המתחרים":
    "The game runs on without you — follow the rivals",
  "🏁 מי משחק עכשיו": "🏁 Who is playing now",
  "עדיין אף אחד לא ניסה — היה הראשון!": "Nobody has tried yet — be the first.",
  "ועוד {count} משתתפים": "and {count} more players",
  "לקח את הפרס": "took the prize",
  "ב־": "in",
  "ניסיון אחרון": "Last attempt",
  "נותרו {count}": "{count} left",
  "אין עדיין זוכה": "No winner yet",

  /* ------------------------------------------------------------------ */
  /* the history tables: battles and spy missions                        */
  /* ------------------------------------------------------------------ */
  "חדש": "NEW",
  "זמן": "Time",
  "יריב": "Rival",
  "פרטים": "Details",
  "תוצאה": "Outcome",
  "מידע שנחשף": "Intelligence gathered",
  "אין דוחות קרב בקטגוריה זו.": "No battle reports in this category.",
  "כבשת את היריב בהצלחה!": "You broke through!",
  "התקפתך נהדפה.": "Your attack was thrown back.",
  "הדפת את ההתקפה בהצלחה!": "You held the walls.",
  "היריב פרץ את הגנתך.": "The rival broke your defence.",
  "האבדות שלך:": "Your losses:",
  "שלל:": "Plunder:",
  "כאן מופיעים רק מרגלים שכוחות הביטחון שלך":
    "Only the spies your own security forces",
  "תפסו": "caught",
  "— ריגול מוצלח נגדך נשאר חשאי ואינו נרשם.":
    "appear here — a successful run against you stays secret and is never logged.",
  "לא שלחת מרגלים עדיין.": "You have not sent any spies yet.",
  "לא נתפסו מרגלים בשטחך.": "No spies have been caught on your ground.",
  "המשימה הצליחה": "The mission succeeded",
  "המרגל נתפס": "The spy was caught",
  "תפסת את המרגל!": "You caught the spy!",
  "כח מודיעין:": "Intelligence power:",
  "(שלך) מול": "(yours) against",
  "סיכוי:": "Odds:",
  "המרגל חוסל לפני שאסף מידע — לא דלף דבר.":
    "The spy was cut down before he gathered anything — nothing leaked.",
  "המרגל אבד במשימה ולא הושג מידע.":
    "The spy was lost on the mission and brought nothing back.",
  "התיק המלא": "The full dossier",

  /* ------------------------------------------------------------------ */
  /* the warehouses                                                      */
  /* ------------------------------------------------------------------ */
  "יש להזין כמות": "Enter an amount",
  "יש להזין מספר שלם גדול מ־0": "Enter a whole number greater than 0",
  "הכמות גדולה מהמשאבים הזמינים": "That is more than you have available",
  "הכמות גדולה מהכמות המאוחסנת במחסן": "That is more than the warehouse holds",
  "פנוי:": "Free:",
  "זמין אצלך:": "Available to you:",
  "כמות": "Amount",
  "כמות להפקדה או משיכה — {label}": "Amount to deposit or withdraw — {label}",
  "מפקיד...": "Depositing…",
  "מושך...": "Withdrawing…",
  "הפקד": "Deposit",
  "משוך": "Withdraw",
  "הפקד הכל": "Deposit all",
  "משוך הכל": "Withdraw all",
  "משאבים במחסן מוגנים ואינם זמינים לשימוש עד שתמשוך אותם.":
    "Resources in the warehouse are protected and cannot be spent until you withdraw them.",
  "לרמה הבאה:": "Next level:",
  "מקום אחסון": "of storage",
  "🔧 שדרג לרמה {level}": "🔧 Upgrade to level {level}",

  /* ------------------------------------------------------------------ */
  /* the guild-war arena                                                 */
  /* ------------------------------------------------------------------ */
  "עכשיו": "just now",
  "לפני {seconds} שנ׳": "{seconds}s ago",
  "לפני {minutes} דק׳": "{minutes}m ago",
  "לפני {hours} שע׳": "{hours}h ago",
  "הקרב נפתח בעוד": "The battle opens in",
  "נותר לקרב": "Left in the battle",
  "המלחמה הבאה בעוד": "The next war in",
  "נרשמו {count} בריתות. צריך לפחות {min} כדי שהמלחמה תתקיים — אחרת הערב מתבטל ואף אחד לא מקבל פרס.":
    "{count} guilds have signed up. At least {min} are needed for the war to happen — otherwise the evening is called off and nobody is paid.",
  "פחות מ־{min} בריתות נרשמו, ולכן המלחמה לא התקיימה. אין מנצחת ואין פרסים.":
    "Fewer than {min} guilds signed up, so the war never happened. There is no victor and no prize.",
  "כבשה את הזירה עם": "took the arena with",
  "נקודות — הפרס מחולק שווה בשווה לכל חברי הברית":
    "points — the prize is split evenly between every member of the guild",
  "הקרב מתנהל": "The battle runs",
  "אוטומטית": "on its own",
  "בין": "between",
  "ל־": "and",
  "(שעון ישראל) — אין מה ללחוץ, המערכת מנהלת את כל ההתנגשויות לבד.":
    "(Israel time) — there is nothing to press; the system runs every clash by itself.",
  "בריתות בזירה": "Guilds in the arena",
  "הברית שלך": "Your guild",
  "סבב": "Round",
  "טבלת הזירה": "The arena table",
  "כוח הברית הוא הכוח הצבאי המשולב של כל החברים. הזירה עצמה נמדדת לפי החבר הממוצע — רוסטר גדול מעלה את הסכום, לא בהכרח את הסיכוי.":
    "A guild's power is the combined military strength of all its members. The arena itself is measured by the average member — a big roster raises the total, not necessarily the odds.",
  "אף ברית לא נרשמה עדיין למלחמה הקרובה — היו הראשונים.":
    "No guild has signed up for the coming war yet — be the first.",
  "כוח הברית": "Guild power",
  "ניצחונות": "Wins",
  "הפסדים": "Losses",
  "לוחמי המלחמה": "The war's fighters",
  "המערכת מסובבת חבר אחר של כל ברית לכל סבב — הטבלה מראה מי הביא הכי הרבה נקודות. אין כאן פרס אישי.":
    "The system rotates a different member of each guild into every round — this table shows who brought in the most points. There is no personal prize here.",
  "לוחם": "Fighter",
  "פריצות": "Breakthroughs",
  "הדיפות": "Holds",
  "שידור חי מהזירה": "Live from the arena",
  "הזירה נפתחת — הסבב הראשון עוד רגע.":
    "The arena is opening — the first round is moments away.",
  "עוד לא היו קרבות במלחמה הזו.": "No clashes in this war yet.",
  "💥 פריצה": "💥 Breakthrough",
  "🛡️ הדיפה": "🛡️ Held",
  "הנקודות ל{guild}": "The points go to {guild}",

  /* ------------------------------------------------------------------ */
  /* the hero-item dialog                                                */
  /* ------------------------------------------------------------------ */
  "דרגה:": "Rarity:",
  "רמת פריט:": "Item level:",
  "סט:": "Set:",
  "דרישת רמה": "Level requirement",
  "גיבור רמה {level}": "Level {level} hero",
  "שדרוג לרמה": "Upgrade to level",
  "סט חדש": "New set",
  "בונוס לאחר שדרוג": "Bonus after the upgrade",
  "עלות": "Cost",
  "🧪 שיקוי הנפח פעיל — {pct}% הנחה על השדרוג":
    "🧪 The smith's brew is live — {pct}% off the upgrade",
  "שדרוג": "Upgrade",
  "שיא הסט ✦": "Set ceiling ✦",
  "רמה מקסימלית ✦": "Max level ✦",
  "אגדי הוא הרמה הגבוהה בסט": "Legendary is the top rung of the",
  "— אין לאן לשדרג אותו יותר. הסט הבא (":
    "set — there is nowhere left to upgrade it. The next set (",
  ") מגיע רק כשלל מתקיפה מנצחת.": ") only arrives as plunder from a won attack.",
  "— אין ציוד גבוה מזה במשחק.": "— there is no higher gear in the game.",
  "החפץ נשמר עליך מהאיפוס וממשיך להעניק את הבונוס המלא. אם תסיר אותו — לא תוכל ללבוש אותו שוב עד שהגיבור יחזור לרמה":
    "This piece survived the reset on you and still pays its full bonus. Take it off and you cannot wear it again until your hero is back at level",
  "אישור — הסר ונעל עד רמה {level}": "Confirm — remove and lock until level {level}",
  "הסר לתיק": "Move to the pack",
  "עלה לרמה {level} כדי ללבוש": "Reach level {level} to wear this",
  "לבש": "Wear",
  "דרוש רמה {level}": "Needs level {level}",
  "אגדי הוא שיא הסט {set} — הסט הבא מגיע כשלל":
    "Legendary is the ceiling of the {set} set — the next set arrives as plunder",
  "דרוש גיבור רמה {level} כדי לשדרג": "Upgrading needs a level {level} hero",
  "אין מספיק זהב": "Not enough gold",
  "שיא הסט": "Set ceiling",
  "אישור זריקה": "Confirm discard",
  "זרוק": "Discard",
  "🎡 סיכוי {pct}% לזכות בסיבוב גלגל מזל מהזריקה":
    "🎡 {pct}% chance the discard wins you a wheel spin",

  /* ------------------------------------------------------------------ */
  /* the bank, and the one-click actions the pass unlocks                */
  /* ------------------------------------------------------------------ */
  "זהב זמין:": "Gold available:",
  "זהב בבנק:": "Gold in the bank:",
  "סכום": "Amount",
  "כמות זהב": "Amount of gold",
  "הפקד לחיסכון": "Deposit to savings",
  "משוך כספים": "Withdraw funds",
  "ניצלת את כל ההפקדות עד העדכון היומי הבא.":
    "You have used every deposit until the next daily update.",
  "הפקדות מוגבלות לפי שדרוג כמות הפקדות בבנק.":
    "Deposits are capped by the bank's deposit-count upgrade.",
  "משיכות אינן מוגבלות.": "Withdrawals are unlimited.",
  "הריבית מחושבת על הזהב שנמצא בבנק בלבד.":
    "Interest is paid on the gold in the bank alone.",
  "הריבית נכנסת בכל עדכון יומי.": "Interest lands on every daily update.",
  "פעולות מהירות": "Quick actions",
  "מציב...": "Assigning…",
  "מחלק...": "Splitting…",
  "מנקה...": "Clearing…",
  "חלק שווה בין המשאבים": "Split evenly between the resources",
  "נקה חלוקה": "Clear the assignment",
  "הפקד הכל · {resource}": "Deposit all · {resource}",
  "משוך הכל · {resource}": "Withdraw all · {resource}",
  "הצב הכל · {resource}": "Assign all · {resource}",

  /* ------------------------------------------------------------------ */
  /* the boss arena — the assault playing itself out                     */
  /* ------------------------------------------------------------------ */
  "הקרב הוכרע": "The battle is decided",
  "הקרב נגמר בעוד": "The battle ends in",
  "מסכמים את השלל…": "Counting the haul…",
  "סבב {round} מתוך {total}": "Round {round} of {total}",
  "· המכה הבאה בעוד {seconds} שנ׳": "· next blow in {seconds}s",
  "אל תסגור — דוח הקרב המלא נפתח בעוד רגע.":
    "Do not close this — the full battle report opens in a moment.",
  "הצבא נלחם לבד. אין מה ללחוץ — אפשר גם לצאת ולחזור.":
    "The army fights on its own. There is nothing to press — you can leave and come back.",
  "הפסים המוזהבים הם הנזק של התקיפה הזו. הפצעים נשארים עליו גם אחרי שהקרב נגמר.":
    "The gold band is this assault's damage. The wounds stay on him after the battle ends.",
  "הקרב הזה כבר הסתיים. הדוח נשלח אליך להודעות.":
    "This battle is already over. The report has been sent to your messages.",
  "הכוחות מסתערים על השער… המכה הראשונה נופלת עוד רגע.":
    "The forces are storming the gate… the first blow lands in a moment.",
  "הגיבור השתחרר.": "The hero broke loose.",
  "{move} של {boss} לא הספיק — מכת זעם אחת הורידה לו {damage} חיים.":
    "{boss}'s {move} was not enough — one fury blow took {damage} health off him.",
  "— הקצינים ענו ב{tactic}": "— the officers answered with {tactic}",
  ", וזו התשובה הנכונה: נזק כפול": ", and that was the right answer: double damage",
  " ובקושי אבדות": " and almost no losses",
  "(−{damage} חיים).": "(−{damage} health).",
  "(−{damage} חיים, −{soldiers} חיילים).": "(−{damage} health, −{soldiers} soldiers).",
  ", וזו התשובה הלא נכונה — היה צריך {tactic}. הנזק נחלש":
    ", and that was the wrong answer — it should have been {tactic}. The damage was blunted",
  "(−{damage} חיים, והמכה נכנסה: −{soldiers} חיילים).":
    "(−{damage} health, and the blow landed: −{soldiers} soldiers).",
  "אפשר לחזור לבוס העיר או לקרוא את הדוח בהודעות.":
    "You can go back to the city boss or read the report in your messages.",
  "אפשר לצאת ולעשות דברים אחרים — כשהקרב ייגמר תקבל הודעה עם כל השלל.":
    "You can leave and do something else — when the battle ends you get a message with the whole haul.",
  "לבסיס": "To the base",
  "לבוס העיר": "To the city boss",
  "הצבא שלך": "Your army",
  "אבדות עד כה:": "Losses so far:",
  "({lossPct}%). הצבא נסוג אם יאבד {routPct}%.":
    "({lossPct}%). The army routs if it loses {routPct}%.",
  "כל החיילים חוזרים הביתה — קרב מול הבוס לא עולה באף חייל.":
    "Every soldier comes home — a boss fight costs you none of them.",
  "מתמלא בכל סבב. כשהוא מתמלא הגיבור משתחרר במכה אחת גדולה.":
    "Fills every round. When it fills, the hero breaks loose in one great blow.",
  "שלל שנצבר עד כה": "Haul earned so far",
  "נצבר לפי הנזק שנגרם עד כה. הפלת הבוס משלמת את האוצר כולו מעל זה, והכול משולם בסוף הקרב.":
    "Earned on the damage landed so far. Killing the boss pays the whole treasure on top, and all of it settles when the battle ends.",
  "יומן הקרב": "Battle log",
  "הכוחות מתקרבים לשער…": "The forces are approaching the gate…",
  "המהלך שלו": "His move",
  "התשובה שלנו": "Our answer",
  "נזק": "Damage",
  "אבדות": "Losses",
  "✔ קריאה נכונה": "✔ read right",
  "✘ קריאה שגויה": "✘ read wrong",
  "קריאות נכונות עד כה:": "Correct reads so far:",
  "מתוך {total} — הן קובעות גם את דירוג הקרב וגם את גודל אוצר ההפלה.":
    "of {total} — they set both the battle grade and the size of the kill treasure.",
  "מה בעצם קורה כאן, ואיך משפרים את התוצאה":
    "What is actually happening here, and how to do better",
  "שילמת תורות ושלחת את הצבא. מרגע הלחיצה הכול כבר מוכרע — הדקה הזו היא הצפייה, לא ההחלטה.":
    "You paid the turns and sent the army. From the moment you pressed, everything is already decided — this minute is the watching, not the deciding.",
  "בכל סבב {boss} מבצע מהלך, והקצינים שלך מנסים לקרוא אותו ולענות בתשובה הנכונה. סיכוי הקריאה שלך כרגע:":
    "Each round {boss} makes a move, and your officers try to read it and answer correctly. Your read chance right now:",
  "— הוא נקבע ברמת הגיבור.": "— it comes from your hero's level.",
  "כשהמונה נגמר משולם השלל": "When the clock runs out the haul is paid",
  ", נכנסות האבדות": ", the losses land",
  ", ונשלחת אליך הודעה עם הסיכום — גם אם עברת בינתיים למסך אחר.":
    ", and a message with the summary is sent to you — even if you have moved to another screen.",
  "שלוש התשובות": "The three answers",
  "כדי לפגוע בו יותר:": "To hit him harder:",
  "כוח התקיפה. עוד חיילים, נשקי תקיפה, ציוד ונקודות תקיפה לגיבור, באפ גילדה ושיקוי כוח — הנזק בכל סבב הוא אחוז מהכוח הזה.":
    "attack power. More soldiers, attack weapons, gear and attack points on the hero, the guild buff and a power potion — each round's damage is a percentage of it.",
  "כדי לאבד פחות חיילים:": "To lose fewer soldiers:",
  "הגיבור. רמה גבוהה יותר = קריאות נכונות יותר, וסבב שנקרא נכון עולה כשליש מהדם.":
    "the hero. A higher level means more correct reads, and a round read right costs a third of the blood.",
  "כדי לקרוא אותו נכון יותר:": "To read him better:",
  "הגיבור. רמה גבוהה יותר = יותר סבבים שנקראים נכון, וכל אחד מהם מכפיל את הנזק.":
    "the hero. A higher level means more rounds read right, and each of those doubles the damage.",
  "גיבור מת מוריד את הקריאה לניחוש ומבטל את הזעם.":
    "A dead hero drops the read to a guess and cancels the fury.",
  "השלל: {chip}% מהאוצר משולם לפי הנזק שגרמת — גם בקרב שלא הפיל אותו — והשאר ({kill}% + ציוד גיבור מובטח) משולם רק למי שמנחית את המכה האחרונה. הפצעים נשארים על הבוס בין תקיפות, אז כל תקיפה מקרבת את ההפלה.":
    "The haul: {chip}% of the treasure is paid on the damage you landed — even in a battle that did not finish him — and the rest ({kill}% plus guaranteed hero gear) goes only to whoever lands the last blow. The wounds stay on the boss between assaults, so every assault brings the kill closer.",

  /* ------------------------------------------------------------------ */
  /* the bag, the paperdoll, the potion belt and the wheel               */
  /* ------------------------------------------------------------------ */
  "התיק": "The pack",
  "חפצים שנלכדו בקרבות וממתינים בתיק. לחיצה על חפץ פותחת את פרטיו — שם אפשר ללבוש, לשדרג או לזרוק.":
    "Gear taken in battle, waiting in the pack. Tap a piece for its details — that is where you wear, upgrade or discard it.",
  "בטל": "Cancel",
  "בחירה": "Select",
  "הקטלוג המלא: כל החפצים הקיימים במשחק, מרמה 1 עד 100 בכל הדרגות":
    "The full catalogue: every item in the game, from level 1 to 100 at every rarity",
  "לכל הפריטים": "All items",
  "נקה בחירה": "Clear selection",
  "סמן הכל": "Select all",
  "מקום בתיק: {slots} סלוטים (5 על 3). כשהתיק מלא — לא נלכדים חפצים חדשים בקרב ואי אפשר להסיר ציוד מהגיבור!":
    "Pack space: {slots} slots (5 by 3). A full pack takes no new gear in battle, and nothing can come off the hero.",
  "סלוטים": "slots",
  "{count} נבחרו": "{count} selected",
  "התיק מלא — חפצים חדשים לא ייכנסו. זרוק או שדרג כדי לפנות מקום.":
    "The pack is full — nothing new will fit. Discard or upgrade to clear a slot.",
  "{slot} רמה {level}": "{slot}, level {level}",
  "לחץ לפרטים": "tap for details",
  "זרוק הכל": "Discard all",
  "שדרג הכל": "Upgrade all",
  "חפצים נלכדים בניצחון בתקיפה על שחקנים אחרים — ככל שהחפץ נדיר יותר, כך קשה יותר ללכוד אותו.":
    "Gear is taken by winning attacks on other players — the rarer the piece, the harder it is to take.",
  "שדרוג חפצים": "Upgrading gear",
  "עומדים לשדרג {count} חפצים לדרגה הבאה.":
    "You are about to upgrade {count} items to the next rung.",
  "עלות כוללת": "Total cost",
  "הזהב שלך": "Your gold",
  "🧪 שיקוי הנפח פעיל — המחירים כאן כבר כוללים {pct}% הנחה.":
    "🧪 The smith's brew is live — the prices here already include the {pct}% discount.",
  "אין מספיק זהב לשדרוג הכל — ישודרגו הזולים ביותר עד שייגמר הזהב.":
    "Not enough gold for all of them — the cheapest will be upgraded until the gold runs out.",
  "משדרג…": "Upgrading…",
  "אישור שדרוג": "Confirm upgrade",

  "{slot} רמה {level} — פרטים": "{slot}, level {level} — details",
  "יש חפץ חזק יותר בתיק": "There is a stronger piece in the pack",
  "תשעת חלקי הציוד שהגיבור לובש, כל אחד במקומו על הגוף. ריחוף מעל חפץ מציג את דרגתו והבונוסים שהוא מעניק. הלבשה והשדרוג נעשים בעמוד הגיבור.":
    "The nine pieces the hero wears, each in its place on the body. Hover a piece for its rarity and the bonuses it pays. Wearing and upgrading happen on the hero screen.",
  "תשעת חלקי הציוד שהגיבור לובש, כל אחד במקומו על הגוף. לחיצה על סלוט ריק בוחרת חפץ מהתיק; לחיצה על חפץ לבוש פותחת את פרטיו. הבונוסים שלהם מרוכזים ב'סך הכל מהגיבור' שלמטה.":
    "The nine pieces the hero wears, each in its place on the body. Tap an empty socket to pick from the pack; tap a worn piece for its details. Their bonuses are totalled in \"Everything the hero pays\" below.",
  "ציוד לבוש": "Gear worn",
  "סלוט ריק": "empty socket",
  "{count} בתיק — לחץ לבחירה": "{count} in the pack — tap to choose",
  "אין חפץ כזה בתיק — לכוד אחד בתקיפה":
    "no piece like this in the pack — take one in an attack",
  "סלוט {slot} ריק": "{slot} socket, empty",
  "סלוט {slot} ריק — בחר חפץ": "{slot} socket, empty — pick a piece",
  "{stat} — בחר חפץ מהתיק כדי ללבוש אותו":
    "{stat} — pick a piece from the pack to wear it",
  "אין חפצי {slot} בתיק.": "No {slot} gear in the pack.",
  "חפצים נלכדים בניצחון בתקיפה על שחקנים אחרים.":
    "Gear is taken by winning attacks on other players.",

  "שיקויים": "Potions",
  "שיקויים נלכדים בניצחון בתקיפה. כל שיקוי מפעיל אפקט זמני על כל האימפריה — לחיצה פותחת את פרטיו ומאפשרת לשתות.":
    "Potions are taken by winning attacks. Each one runs a timed effect over the whole empire — tap for its details and to drink it.",
  "שיקויים נופלים מתקיפות מוצלחות. שתיית שיקוי שכבר פועל מאריכה אותו — לעולם לא בזבוז.":
    "Potions drop from successful attacks. Drinking one that is already running extends it — never a waste.",
  "{potion} — {tagline} ({duration})": "{potion} — {tagline} ({duration})",
  " · אין לך אחד כזה": " · you have none of these",
  "משך:": "Lasts:",
  "בתרמיל:": "In the satchel:",
  "פועל כרגע — נותר": "Running now — left",
  "אין לך שיקוי כזה — נלכד בתקיפות מוצלחות":
    "You have none of these — they drop from successful attacks",
  "שותה…": "Drinking…",
  "אין במלאי": "None in stock",
  "שתה והארך": "Drink and extend",
  "שתה": "Drink",

  "גלגל המזל": "The Wheel of Fortune",
  "הושלמו {count} סיבובים — הנה מה שזכית בו:":
    "{count} spins done — here is what you won:",
  "כבה צלילים": "Mute the sound",
  "הפעל צלילים": "Unmute the sound",
  "סיבובים זמינים": "Spins available",
  "מחזור {cycle} לעונה — הפרסים גדלים בכל עדכון יומי!":
    "Cycle {cycle} of the season — the prizes grow with every daily update.",
  "פרס ״חפץ״ דורש לפחות מקום פנוי אחד בתיק הגיבור.":
    "An \"item\" prize needs at least one free slot in the hero's pack.",
  "סובב את כל הסיבובים הזמינים בבת אחת (עד 10)":
    "Spin every available spin at once (up to 10)",
  "מסתובב…": "Spinning…",
  "סובב": "Spin",
  "כפתור הבאטץ׳ מסובב את כל הסיבובים הזמינים בבת אחת (עד 10).":
    "The batch button spins every available spin at once (up to 10).",

  "ניסיונות": "attempts",
  "זוכה בלבד": "winner only",
  "אחר כך — הכפתור למעלה שומר לי אותו":
    "Later — the pill above keeps it for me",

  /* ------------------------------------------------------------------ */
  /* sign-up, sign-in and the account itself                             */
  /* ------------------------------------------------------------------ */
  "שם האימפריה כבר תפוס, בחר שם אחר": "That empire name is taken — pick another",
  "אירעה שגיאה ביצירת האימפריה, נסה שוב":
    "Something went wrong founding the empire — try again",
  "יותר מדי נסיונות הרשמה. נסה שוב מאוחר יותר.":
    "Too many sign-up attempts. Try again later.",
  "כתובת האימייל כבר רשומה במערכת": "That email address is already registered",
  "אירעה שגיאה בהרשמה, נסה שוב": "Something went wrong signing up — try again",
  "יותר מדי נסיונות התחברות. נסה שוב מאוחר יותר.":
    "Too many sign-in attempts. Try again later.",
  "יותר מדי נסיונות התחברות לחשבון זה. נסה שוב מאוחר יותר.":
    "Too many sign-in attempts for this account. Try again later.",
  "אימייל או סיסמה שגויים": "Wrong email or password",
  "יותר מדי נסיונות. נסה שוב מאוחר יותר.": "Too many attempts. Try again later.",
  "החשבון הזה מחובר דרך Google בלבד ואין לו סיסמה לשינוי.":
    "This account signs in with Google only and has no password to change.",
  "הסיסמה הנוכחית שגויה": "That is not your current password",
  "הסיסמה החדשה זהה לנוכחית": "The new password is the same as the current one",
  "הסיסמה שונתה. כל המכשירים האחרים נותקו.":
    "Password changed. Every other device has been signed out.",
  "אימות מול Google נכשל, נסה שוב": "Verifying with Google failed — try again",
  "כתובת האימייל של חשבון Google אינה מאומתת":
    "That Google account's email address is not verified",
  "כתובת האימייל הזו כבר רשומה עם סיסמה. התחבר עם האימייל והסיסמה שלך.":
    "That email address is already registered with a password. Sign in with your email and password.",
  "כתובת האימייל הזו כבר משויכת לחשבון Google אחר.":
    "That email address is already linked to another Google account.",
  "קישור אימות לא תקין": "That verification link is not valid",
  "קישור האימות אינו תקין": "That verification link is not valid",
  "פג תוקף הקישור — שלח לעצמך קישור חדש":
    "The link has expired — send yourself a new one",
  "הקישור כבר נוצל — שלח לעצמך קישור חדש":
    "That link has already been used — send yourself a new one",
  "נשלחו יותר מדי קישורים. נסה שוב בעוד שעה.":
    "Too many links sent. Try again in an hour.",
  "נשלחו יותר מדי קישורים. נסה שוב מאוחר יותר.":
    "Too many links sent. Try again later.",
  "האימייל שלך כבר מאומת": "Your email is already verified",
  "שלחנו קישור אימות חדש. בדוק את תיבת הדואר.":
    "A new verification link is on its way. Check your inbox.",
  "שליחת המייל נכשלה. נסה שוב בעוד רגע.":
    "Sending the email failed. Try again in a moment.",

  /* the sign-up form's own validation (the zod schemas in actions/auth.ts) */
  "בחר דמות גיבור": "Choose a hero class",
  "שם חייב להכיל לפחות 2 תווים": "A name needs at least 2 characters",
  "שם האימפריה חייב להכיל לפחות 2 תווים":
    "An empire name needs at least 2 characters",
  "כתובת אימייל לא תקינה": "That email address is not valid",
  "סיסמה חייבת להכיל לפחות 8 תווים": "A password needs at least 8 characters",
  "יש להזין סיסמה": "Enter a password",
  "יש להזין את הסיסמה הנוכחית": "Enter your current password",
  "סיסמה חדשה חייבת להכיל לפחות 8 תווים":
    "A new password needs at least 8 characters",

  /* hero gear */
  "ברשותך מאז": "Yours since",
  "לבש {item}": "Equip {item}",
  "דרוש גיבור רמה {level}": "Needs a level {level} hero",

};
