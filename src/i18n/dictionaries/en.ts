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
  // The wordmark's Hebrew subtitle: in English the crest above it already
  // spells KRALDOR, so repeating it would be the same word twice.
  "קראלדור": "Kingdom of Kraldor",
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
};
