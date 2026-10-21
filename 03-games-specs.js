function gameType(g){ return (g && g.type) || 'game'; }
(function(){
  const fix = {pubg:'mobile', telegram:'app', discord:'app'};
  GAMES.forEach(g=>{ g.type = fix[g.id] || 'game'; });
  const pal = ['#e0a840','#b23a48','#ff4d5e','#5b8def','#8e5cff','#4b6a8f','#29a9ea','#00a2ff','#5b8731','#c9a53b','#d68a2a','#7289da','#e85d9a','#2fb59a','#f2733d','#6c5ce7'];
  const subs = {game:'аккаунты, предметы', mobile:'аккаунты, донат', app:'аккаунты, подписки'};
  const add = (type, prefix, str)=>{ str.split('|').forEach((name,i)=>{ let h=0; for(let k=0;k<name.length;k++) h=(h*31+name.charCodeAt(k))>>>0; GAMES.push({id:prefix+(i+1), name:name, color:pal[h%pal.length], sub:subs[type], type:type}); }); };
  add('game','pc',"League of Legends|Apex Legends|Overwatch 2|Rainbow Six Siege|Call of Duty: Warzone|Call of Duty: Modern Warfare III|Call of Duty: Modern Warfare II|Call of Duty: Black Ops 6|Call of Duty: Black Ops Cold War|Battlefield 2042|Battlefield V|Battlefield 4|Battlefield 1|PUBG: Battlegrounds|Rust|DayZ|Escape from Tarkov|Grand Theft Auto V|GTA Online|Red Dead Redemption 2|Cyberpunk 2077|The Witcher 3|Elden Ring|Dark Souls III|Dark Souls Remastered|Sekiro: Shadows Die Twice|Baldur's Gate 3|Diablo IV|Diablo III|Path of Exile|Path of Exile 2|Lost Ark|New World|Black Desert Online|Albion Online|Guild Wars 2|Final Fantasy XIV|The Elder Scrolls Online|Warframe|Destiny 2|Hearthstone|Team Fortress 2|Left 4 Dead 2|Counter-Strike 1.6|Counter-Strike: Source|Half-Life 2|Portal 2|Garry's Mod|Terraria|Stardew Valley|Don't Starve Together|Rocket League|Fall Guys|Among Us|Phasmophobia|Dead by Daylight|Lethal Company|Palworld|Valheim|Satisfactory|Factorio|Raft|Subnautica|The Forest|Sons of the Forest|7 Days to Die|ARK: Survival Evolved|ARK: Survival Ascended|Conan Exiles|Project Zomboid|Cities: Skylines|Civilization VI|Civilization V|Total War: Warhammer III|Age of Empires II|Age of Empires IV|StarCraft II|Warcraft III|Command & Conquer|Company of Heroes 3|Hearts of Iron IV|Europa Universalis IV|Crusader Kings III|Stellaris|XCOM 2|Football Manager 2024|FIFA 23|EA Sports FC 24|EA Sports FC 25|NBA 2K24|Madden NFL 24|F1 24|Forza Horizon 5|Forza Horizon 4|Assetto Corsa|Euro Truck Simulator 2|American Truck Simulator|Microsoft Flight Simulator|The Sims 4|The Sims 3|Planet Zoo|Planet Coaster|Two Point Hospital|Hogwarts Legacy|Starfield|Fallout 4|Fallout 76|Fallout: New Vegas|The Elder Scrolls V: Skyrim|The Elder Scrolls IV: Oblivion|The Elder Scrolls III: Morrowind|Mass Effect Legendary Edition|Dragon Age: Inquisition|Dragon Age: Origins|Assassin's Creed Valhalla|Assassin's Creed Odyssey|Assassin's Creed Mirage|Far Cry 6|Far Cry 5|Watch Dogs 2|The Division 2|Ghost Recon Wildlands|Anno 1800|For Honor|The Crew 2|The Division|Hitman 3|Resident Evil 4|Resident Evil Village|Resident Evil 2|Devil May Cry 5|Monster Hunter: World|Monster Hunter Rise|Street Fighter 6|Tekken 8|Mortal Kombat 1|Mortal Kombat 11|Dragon Ball FighterZ|Naraka: Bladepoint|Dead Space|Alan Wake 2|Control|Metro Exodus|S.T.A.L.K.E.R. 2|S.T.A.L.K.E.R.: Shadow of Chernobyl|Titanfall 2|Halo Infinite|Halo: The Master Chief Collection|Gears 5|Sea of Thieves|Deep Rock Galactic|Helldivers 2|Risk of Rain 2|Vampire Survivors|Hades|Hades II|Hollow Knight|Cuphead|Celeste|Dead Cells|Slay the Spire|Balatro|Darkest Dungeon|Disco Elysium|Undertale|Deltarune|Outer Wilds|No Man's Sky|Elite Dangerous|Star Citizen|EVE Online|Kerbal Space Program|Space Engineers|RimWorld|Oxygen Not Included|Prison Architect|Frostpunk|This War of Mine|Cult of the Lamb|Hotline Miami|Superhot|Portal|Left 4 Dead|Payday 2|Payday 3|Killing Floor 2|Back 4 Blood|World War Z|Sniper Elite 5|Squad|Hell Let Loose|Arma 3|Arma Reforger|War Thunder|World of Tanks|World of Warships|Armored Warfare|Crossout|Enlisted|Delta Force|The Finals|Splitgate|Paladins|Smite|Brawlhalla|Dauntless|Tower of Fantasy|Wuthering Waves|Honkai: Star Rail|Zenless Zone Zero|Honkai Impact 3rd|Lineage 2|Lineage 2 Essence|Aion|Tera|Blade & Soul|Perfect World|Ragnarok Online|MapleStory|RuneScape|Old School RuneScape|Tibia|Mu Online|Silkroad Online|Metin2|Cabal Online|Priston Tale|Dofus|Wakfu|Neverwinter|Star Trek Online|Star Wars: The Old Republic|Star Wars Battlefront II|Star Wars Jedi: Survivor|Dying Light 2|Dying Light|Dead Island 2|Days Gone|Horizon Zero Dawn|God of War|Marvel's Spider-Man Remastered|The Last of Us Part I|Death Stranding|Ghost of Tsushima|Mafia: Definitive Edition|Mafia III|Saints Row|Just Cause 4|Borderlands 3|Borderlands 2|Tiny Tina's Wonderlands|Gunfire Reborn|Remnant II|Lies of P|Wo Long: Fallen Dynasty|Nioh 2|Armored Core VI|Black Myth: Wukong|Stray|Little Nightmares II|Inside|Limbo|It Takes Two|A Way Out|Unravel Two|Overcooked 2|Human Fall Flat|Party Animals|Pummel Party|Golf With Your Friends|Ultimate Chicken Horse|Besiege|Cities XL|Tropico 6|Surviving Mars|Banished|Stronghold Crusader|Heroes of Might and Magic III|Heroes of Might and Magic V|Warhammer 40,000: Darktide|Warhammer 40,000: Space Marine 2|Vermintide 2|Total War: Rome II|Total War: Three Kingdoms|Shadow of War|Mount & Blade II: Bannerlord|Mount & Blade: Warband|Kenshi|Chivalry 2|Mordhau");
  add('mobile','mob',"Mobile Legends: Bang Bang|Honor of Kings|Free Fire|Call of Duty: Mobile|Clash of Clans|Clash Royale|Brawl Stars|Standoff 2|Critical Ops|Pixel Gun 3D|Block Strike|Among Us Mobile|Subway Surfers|Temple Run 2|Candy Crush Saga|Candy Crush Soda Saga|Homescapes|Gardenscapes|Fishdom|Township|Hay Day|Boom Beach|Clash Mini|Squad Busters|Stumble Guys|Coin Master|Monopoly GO|Royal Match|Royal Kingdom|Toon Blast|Toy Blast|Merge Dragons|Dragon City|Monster Legends|Pokémon GO|Pokémon TCG Pocket|Pokémon UNITE|Pokémon Masters EX|Fate/Grand Order|Arknights|Azur Lane|Girls' Frontline|Diablo Immortal|Lineage 2M|Lineage W|Black Desert Mobile|RAID: Shadow Legends|AFK Arena|AFK Journey|Rise of Kingdoms|Lords Mobile|State of Survival|Whiteout Survival|Last Day on Earth|Last Shelter: Survival|Evony|Mafia City|Puzzles & Survival|Vikings: War of Clans|Game of Sultans|Empires & Puzzles|Summoners War|Epic Seven|The Seven Deadly Sins: Grand Cross|Dragon Ball Z Dokkan Battle|Dragon Ball Legends|Naruto x Boruto Ninja Voltage|Bleach: Brave Souls|One Piece Treasure Cruise|Marvel Snap|Marvel Contest of Champions|Marvel Future Fight|Marvel Strike Force|Injustice 2 Mobile|Mortal Kombat Mobile|WWE SuperCard|Asphalt 9: Legends|Asphalt 8: Airborne|Real Racing 3|CSR Racing 2|Need for Speed: No Limits|Hill Climb Racing|Hill Climb Racing 2|Traffic Rider|Car Parking Multiplayer|Drive Zone Online|Rally Fury|Beach Buggy Racing 2|Mario Kart Tour|Angry Birds 2|Cut the Rope|Fruit Ninja|Plants vs. Zombies 2|Bloons TD 6|Kingdom Rush|League of Legends: Wild Rift|Teamfight Tactics Mobile|Arena of Valor|Vainglory|Shadow Fight 3|Shadow Fight 4: Arena|Dead Trigger 2|Modern Combat 5|Sniper 3D|Hitman Sniper|Hitman GO|Hunter Assassin|Archero|Brotato Mobile|Soul Knight|Survivor.io|Zombie Catchers|Idle Miner Tycoon|AdVenture Capitalist|Cookie Clicker Mobile|Egg, Inc.|Cell to Singularity|Idle Heroes|Cookie Run: Kingdom|Cookie Run: OvenBreak|Fire Emblem Heroes|Dragalia Lost|Monster Hunter Now|Monster Strike|Puzzle & Dragons|Granblue Fantasy|Princess Connect! Re:Dive|Uma Musume Pretty Derby|Goddess of Victory: Nikke|Punishing: Gray Raven|Reverse: 1999|Identity V|Dead by Daylight Mobile|LifeAfter|Rules of Survival|Knives Out|Bullet Echo|Zooba|Hungry Shark Evolution|Fishing Clash|Real Boxing 2|Golf Clash|8 Ball Pool|Carrom Pool|Ludo King|Words with Friends 2|Wordscapes|Trivia Crack|Zynga Poker|Slotomania|DoubleDown Casino|Solitaire (MobilityWare)|Spider Solitaire|Sudoku.com|Block Blast|Woodoku|1010!|2048|Tetris|Tetris Block Puzzle|Bejeweled Blitz|June's Journey|Hidden City|Lily's Garden|Matchington Mansion|Project Makeover|Love and Deepspace|Love Nikki|Shining Nikki|Infinity Nikki|Sky: Children of the Light|Animal Crossing: Pocket Camp|The Sims Mobile|The Sims FreePlay|SimCity BuildIt|FarmVille 2|Farm Heroes Saga|Fallout Shelter|Disney Magic Kingdoms|My Talking Tom|My Talking Tom 2|My Talking Angela 2|Toca Boca World|Avakin Life|IMVU|Geometry Dash|Crossy Road|Alto's Odyssey|Monument Valley 2|Rainbow Six Mobile|Warzone Mobile|Apex Legends Mobile|Blockman GO|Bed Wars|Garena Undawn|Arena Breakout|Farlight 84|Free Fire MAX|Mobile Legends: Adventure|Magic Chess: Go Go");
  add('app','app',"WhatsApp|Viber|Signal|Skype|Zoom|Slack|Instagram|Facebook|TikTok|Snapchat|X (Twitter)|Threads|Pinterest|LinkedIn|Reddit|VK|Одноклассники|Twitch|YouTube|YouTube Music|Spotify|Apple Music|Яндекс Музыка|VK Музыка|Deezer|SoundCloud|Shazam|Netflix|Disney+|HBO Max|Amazon Prime Video|Кинопоиск|ivi|Wink|Crunchyroll|Tinder|Bumble|Badoo|Hinge|Uber|Яндекс Go|Bolt|inDrive|Booking.com|Airbnb|Aviasales|Ozon|Wildberries|AliExpress|Temu|Shein|Amazon|eBay|Avito|Яндекс Маркет|PayPal|Wise|Revolut|Payoneer|Binance|Bybit|OKX|KuCoin|Coinbase|Trust Wallet|MetaMask|Т-Банк|Сбербанк Онлайн|Альфа-Банк|ВТБ|Райффайзен|ЮMoney|Kaspi.kz|Notion|Evernote|Todoist|Trello|Asana|Google Drive|Dropbox|OneDrive|Microsoft 365|Google One|iCloud+|Adobe Creative Cloud|Photoshop|Lightroom|Canva|Figma|CapCut|InShot|Snapseed|Remini|ChatGPT|Gemini|Midjourney|Perplexity|Microsoft Copilot|Grammarly|DeepL|Duolingo|Babbel|Quizlet|Coursera|Udemy|Skillshare|Headspace|Calm|Strava|MyFitnessPal|Kindle|Audible|Storytel|Литрес|Яндекс Плюс|NordVPN|ExpressVPN|Surfshark|ProtonVPN|CyberGhost|Proton Mail|Gmail|Outlook|1Password|Bitwarden|Kaspersky|Avast|Malwarebytes|GitHub|GitHub Copilot|Epic Games Launcher|Battle.net|EA app|Ubisoft Connect|GOG Galaxy|Xbox Game Pass|PlayStation Plus|Nintendo Switch Online|GeForce NOW|Patreon|Boosty|Fiverr|Upwork|Kwork|Google Meet|AnyDesk|TeamViewer|2GIS");
})();
/* --- фирменные иконки игр (оригинальные значки, не логотипы правообладателей) --- */
const GAME_EMBLEM = {
  cs2:'<circle cx="12" cy="12" r="6.5" fill="none"/><path d="M12 2v5M12 17v5M2 12h5M17 12h5" fill="none"/>',
  dota2:'<path d="M12 3l7 3v5c0 5-3 8-7 10-4-2-7-5-7-10V6z" fill="none"/><path d="M12 8v8M9 11h6" fill="none"/>',
  valorant:'<path d="M3 5l8 14h2l8-14h-4l-5 9-5-9z" fill="#fff" stroke="none"/>',
  genshin:'<path d="M12 2l2.6 7.4L22 12l-7.4 2.6L12 22l-2.6-7.4L2 12l7.4-2.6z" fill="#fff" stroke="none"/>',
  fortnite:'<path d="M13 2L4 14h7l-1 8 9-12h-7z" fill="#fff" stroke="none"/>',
  steam:'<circle cx="12" cy="12" r="3.5" fill="none"/><path d="M12 2v3M12 19v3M2 12h3M19 12h3M5 5l2 2M17 17l2 2M19 5l-2 2M7 17l-2 2" fill="none"/>',
  telegram:'<path d="M22 3L2 11l7 2.5L11 21l3-4.5L19 21z" fill="#fff" stroke="none"/><path d="M9 13.5L22 3" fill="none" stroke="rgba(0,0,0,.3)"/>',
  roblox:'<rect x="6" y="6" width="12" height="12" rx="1.5" transform="rotate(15 12 12)" fill="#fff" stroke="none"/><rect x="10" y="10" width="4" height="4" transform="rotate(15 12 12)" fill="rgba(0,0,0,.4)" stroke="none"/>',
  minecraft:'<path d="M12 2l9 5v10l-9 5-9-5V7z" fill="#fff" fill-opacity=".92" stroke="none"/><path d="M12 12l9-5M12 12L3 7M12 12v10" fill="none" stroke="rgba(0,0,0,.35)"/>',
  wow:'<path d="M5 19L19 5M15 5h4v4M8 16l-3 3M9.5 14.5l-3 3" fill="none"/>',
  pubg:'<path d="M12 3l8 4.5v9L12 21l-8-4.5v-9z" fill="none"/><circle cx="12" cy="12" r="2.5" fill="#fff" stroke="none"/>',
  discord:'<path d="M6 8h12a4 4 0 0 1 4 4v3a3 3 0 0 1-5 2l-1.5-2h-7L7 17a3 3 0 0 1-5-2v-3a4 4 0 0 1 4-4z" fill="none"/><path d="M8 11v3M6.5 12.5h3" fill="none"/><circle cx="16" cy="12" r="1" fill="#fff" stroke="none"/>'
};
function shadeHex(hex, pct){
  const n = parseInt(hex.replace('#',''),16); let r=(n>>16)&255, g=(n>>8)&255, b=n&255;
  const f = v => Math.max(0, Math.min(255, Math.round(v + (pct<0 ? v*pct : (255-v)*pct))));
  return '#'+[f(r),f(g),f(b)].map(v=>v.toString(16).padStart(2,'0')).join('');
}
function gameIcon(g, size){
  size = size || 48;
  if(!g) return '';
  const r = Math.round(size*0.24);
  if(g.img) return `<div style="width:${size}px;height:${size}px;border-radius:${r}px;flex-shrink:0;background:url('${g.img}') center/cover;"></div>`;
  const em = GAME_EMBLEM[g.id];
  const inner = em
    ? `<svg viewBox="0 0 24 24" width="${Math.round(size*0.6)}" height="${Math.round(size*0.6)}" stroke="#fff" stroke-width="1.9" stroke-linecap="round" stroke-linejoin="round" style="filter:drop-shadow(0 2px 3px rgba(0,0,0,.35));">${em}</svg>`
    : `<span style="font-family:var(--font-display);font-weight:800;color:#fff;font-size:${Math.round(size*0.42)}px;">${esc((g.name||'?')[0])}</span>`;
  return `<div style="width:${size}px;height:${size}px;border-radius:${r}px;flex-shrink:0;display:flex;align-items:center;justify-content:center;position:relative;overflow:hidden;background:linear-gradient(145deg, ${shadeHex(g.color,0.18)}, ${shadeHex(g.color,-0.42)});box-shadow:inset 0 0 0 1px rgba(255,255,255,.12);"><span style="position:absolute;top:-30%;left:-20%;width:90%;height:80%;border-radius:50%;background:radial-gradient(circle, rgba(255,255,255,.28), transparent 65%);"></span>${inner}</div>`;
}
let gamesQuery = '';
let gamesType = 'game';
let gamesLimit = 120;
function setGamesType(t){ gamesType = t; gamesLimit = 120; renderGamesList(); }
function gamesMore(){ gamesLimit += 120; renderGamesList(); }
function gameTags(g){ return String(g.sub||'').split(',').map(t=>t.trim()).filter(Boolean).map(t=>t[0].toUpperCase()+t.slice(1)).join(', '); }
function pageGames(){
  return `${topbar({title:'Игры', back:true, solid:true})}
  <div class="page">
    <div class="search-bar" style="margin-bottom:14px;">
      ${icon('search',18,'var(--text-faint)')}
      <input class="input" placeholder="Поиск игр и приложений" value="${esc(gamesQuery)}" oninput="gamesQuery=this.value; gamesLimit=120; renderGamesList();">
    </div>
    <div id="games-tabs" style="margin-bottom:6px;"></div>
    <div id="games-list"></div>
  </div>`;
}
function renderGamesList(){
  const el = document.getElementById('games-list'); if(!el) return;
  const q = gamesQuery.trim().toLowerCase();
  const match = g=>!q || g.name.toLowerCase().includes(q) || String(g.sub||'').toLowerCase().includes(q);
  const counts = {game:0, mobile:0, app:0};
  GAMES.forEach(g=>{ if(match(g)) counts[gameType(g)]++; });
  const tabsEl = document.getElementById('games-tabs');
  if(tabsEl) tabsEl.innerHTML = `<div style="display:flex;gap:8px;flex-wrap:wrap;">${Object.keys(GAME_TYPES).map(t=>`<div class="chip ${gamesType===t?'active':''}" onclick="setGamesType('${t}')">${GAME_TYPES[t]} · ${counts[t]}</div>`).join('')}</div>`;
  const list = GAMES.filter(g=>gameType(g)===gamesType && match(g));
  if(list.length===0){
    const other = Object.keys(GAME_TYPES).filter(t=>t!==gamesType && counts[t]>0);
    el.innerHTML = `<div class="empty-state">${icon('search',34,'var(--text-faint)')}<div class="h2">Здесь ничего не найдено</div>${other.length?`<div class="muted" style="font-size:13px;">Есть в разделах: ${other.map(t=>GAME_TYPES[t]+' ('+counts[t]+')').join(', ')}</div>`:''}</div>`; return;
  }
  el.innerHTML = list.slice(0,gamesLimit).map(g=>{
    const n = state.listings.filter(l=>l.gameId===g.id && !l.sold && (!l.moderation || l.moderation==='approved')).length;
    return `<div style="display:flex;align-items:center;gap:14px;padding:13px 0;border-bottom:1px solid #ffffff10;cursor:pointer;" onclick="navigate('/catalog?game=${g.id}')">
      ${gameIcon(g,56)}
      <div style="flex:1;min-width:0;">
        <div class="h3" style="font-size:15px;">${esc(g.name)}</div>
        <div class="faint" style="font-size:12.5px;line-height:1.4;margin-top:2px;">${esc(gameTags(g))}</div>
      </div>
      <span class="faint" style="font-size:12px;">${n}</span>
      ${devAllowed() ? `<span style="font-size:17px;padding:4px 6px;cursor:pointer;" onclick="event.stopPropagation();navigate('/dev/game/${g.id}')">✎</span>` : ''}
    </div>`;
  }).join('') + (list.length>gamesLimit ? `<button class="btn btn-ghost btn-block" style="margin-top:14px;" onclick="gamesMore()">Показать ещё (${list.length-gamesLimit})</button>` : '');
}
const GAMES_DEFAULT = GAMES.map(g=>Object.assign({}, g));
function applyGameEdits(){
  const edits = (state && state.gameEdits) || {};
  const custom = (state && state.customGames) || [];
  GAMES.length = 0;
  GAMES_DEFAULT.forEach(g=>GAMES.push(Object.assign({}, g, edits[g.id]||{})));
  custom.forEach(g=>GAMES.push(Object.assign({}, g, edits[g.id]||{})));
}
const CATEGORIES = ['Все','Аккаунты','Предметы','Валюта','Услуги','Ключи'];
/* --- обязательные характеристики товара: у каждой игры и категории свои --- */
const YN = ['Да','Нет'];
const GAME_SPECS = {
  cs2:[
    {k:'rank',label:'Ранг',t:'sel',o:['Без ранга','Silver','Gold Nova','Master Guardian','Legendary Eagle','Supreme','Global Elite']},
    {k:'level',label:'Уровень профиля',t:'num'},
    {k:'prime',label:'Prime статус',t:'sel',o:YN},
    {k:'hours',label:'Часов в игре',t:'num'},
    {k:'skins',label:'Какие скины',t:'txt',ph:'Названия или «Нет»'}
  ],
  dota2:[
    {k:'rank',label:'Ранг',t:'sel',o:['Не калибровался','Рекрут','Страж','Рыцарь','Герой','Легенда','Властелин','Божество','Титан']},
    {k:'mmr',label:'MMR',t:'num'},
    {k:'level',label:'Уровень аккаунта',t:'num'},
    {k:'hours',label:'Часов в игре',t:'num'},
    {k:'items',label:'Аркана и редкие предметы',t:'txt',ph:'Названия или «Нет»'}
  ],
  valorant:[
    {k:'rank',label:'Ранг',t:'sel',o:['Без ранга','Iron','Bronze','Silver','Gold','Platinum','Diamond','Ascendant','Immortal','Radiant']},
    {k:'level',label:'Уровень аккаунта',t:'num'},
    {k:'region',label:'Регион',t:'sel',o:['EU','NA','AP','KR','BR','LATAM']},
    {k:'agents',label:'Открыто агентов',t:'num'},
    {k:'skins',label:'Какие скины',t:'txt',ph:'Названия или «Нет»'}
  ],
  genshin:[
    {k:'ar',label:'Ранг приключений (AR)',t:'num'},
    {k:'server',label:'Сервер',t:'sel',o:['Europe','America','Asia','TW, HK, MO']},
    {k:'five',label:'Персонажей 5★',t:'num'},
    {k:'weapons',label:'Оружие 5★',t:'txt',ph:'Названия или «Нет»'}
  ],
  fortnite:[
    {k:'level',label:'Уровень',t:'num'},
    {k:'skinsCount',label:'Скинов всего',t:'num'},
    {k:'rare',label:'Редкие скины',t:'txt',ph:'Названия или «Нет»'},
    {k:'platform',label:'Платформа',t:'sel',o:['PC','PlayStation','Xbox','Switch','Mobile']},
    {k:'vbucks',label:'V-Bucks на балансе',t:'num'}
  ],
  steam:[
    {k:'level',label:'Уровень Steam',t:'num'},
    {k:'games',label:'Игр в библиотеке',t:'num'},
    {k:'region',label:'Регион',t:'sel',o:['Россия','СНГ','Европа','Другой']},
    {k:'bans',label:'Баны (VAC / игровые)',t:'sel',o:['Нет банов','Есть баны']}
  ],
  telegram:[
    {k:'age',label:'Возраст аккаунта (лет)',t:'num'},
    {k:'premium',label:'Telegram Premium',t:'sel',o:YN},
    {k:'subs',label:'Подписчиков / контактов',t:'num'},
    {k:'username',label:'Юзернейм',t:'sel',o:['Есть','Нет']}
  ],
  roblox:[
    {k:'robux',label:'Robux на балансе',t:'num'},
    {k:'premium',label:'Roblox Premium',t:'sel',o:YN},
    {k:'age',label:'Возраст аккаунта (лет)',t:'num'},
    {k:'limiteds',label:'Лимитированные вещи',t:'txt',ph:'Названия или «Нет»'}
  ],
  minecraft:[
    {k:'edition',label:'Версия',t:'sel',o:['Java','Bedrock','Java + Bedrock']},
    {k:'capes',label:'Плащи',t:'txt',ph:'Какие или «Нет»'},
    {k:'rank',label:'Донат-ранг на серверах',t:'txt',ph:'Какой или «Нет»'},
    {k:'mail',label:'Полный доступ к почте',t:'sel',o:YN}
  ],
  wow:[
    {k:'region',label:'Регион',t:'sel',o:['EU','US','KR','TW']},
    {k:'cls',label:'Класс',t:'sel',o:['Воин','Паладин','Охотник','Разбойник','Жрец','Рыцарь смерти','Шаман','Маг','Чернокнижник','Монах','Друид','Охотник на демонов','Эвокер']},
    {k:'level',label:'Уровень персонажа',t:'num'},
    {k:'faction',label:'Фракция',t:'sel',o:['Альянс','Орда']},
    {k:'ilvl',label:'Уровень предметов (ilvl)',t:'num'}
  ],
  pubg:[
    {k:'rank',label:'Ранг',t:'sel',o:['Без ранга','Bronze','Silver','Gold','Platinum','Diamond','Crown','Ace','Conqueror']},
    {k:'level',label:'Уровень аккаунта',t:'num'},
    {k:'skins',label:'Какие скины',t:'txt',ph:'Названия или «Нет»'},
    {k:'rp',label:'Royale Pass',t:'sel',o:['Нет','Есть']}
  ],
  discord:[
    {k:'nitro',label:'Nitro',t:'sel',o:['Нет','Nitro Basic','Nitro']},
    {k:'age',label:'Возраст аккаунта (лет)',t:'num'},
    {k:'badges',label:'Значки профиля',t:'txt',ph:'Какие или «Нет»'}
  ]
};
const GAME_SPECS_FALLBACK = [
  {k:'level',label:'Уровень',t:'num'},
  {k:'rank',label:'Ранг или статус',t:'txt',ph:'Например: Gold или «Нет»'},
  {k:'items',label:'Предметы и скины',t:'txt',ph:'Какие или «Нет»'}
];
const CAT_SPECS = {
  'Предметы':[
    {k:'item',label:'Название предмета',t:'txt',ph:'Например: AK-47 | Redline'},
    {k:'rarity',label:'Редкость',t:'sel',o:['Обычный','Редкий','Эпический','Легендарный','Уникальный']},
    {k:'wear',label:'Состояние',t:'sel',o:['Новый','Б/у','Не применимо']},
    {k:'qty',label:'Количество',t:'num'}
  ],
  'Валюта':[
    {k:'cur',label:'Тип валюты',t:'txt',ph:'Например: Robux, золото, UC'},
    {k:'amount',label:'Сколько',t:'num'},
    {k:'method',label:'Способ передачи',t:'sel',o:['Вход на аккаунт','Передача в игре','Код пополнения']}
  ],
  'Услуги':[
    {k:'stype',label:'Тип услуги',t:'sel',o:['Буст ранга','Прокачка','Обучение','Выполнение заданий','Другое']},
    {k:'target',label:'Что получит покупатель',t:'txt',ph:'Например: до Gold, до 60 уровня'},
    {k:'term',label:'Срок (дней)',t:'num'}
  ],
  'Ключи':[
    {k:'kind',label:'Что за ключ',t:'sel',o:['Игра','Подписка','Внутриигровой код','Другое']},
    {k:'kqty',label:'Сколько ключей',t:'num'},
    {k:'platform',label:'Платформа активации',t:'sel',o:['Steam','Epic Games','Battle.net','EA App','Другая']},
    {k:'region',label:'Регион',t:'sel',o:['Весь мир','Россия','СНГ','Европа','Другой']}
  ]
};
function specBuiltin(gameId, cat){
  if(cat && cat!=='Аккаунты' && CAT_SPECS[cat]) return CAT_SPECS[cat];
  return GAME_SPECS[gameId] || GAME_SPECS_FALLBACK;
}
function specFields(gameId, cat){
  if(!gameId) return [];
  const ed = state && state.specEdits, key = gameId+'|'+(cat||'Аккаунты');
  if(ed && Array.isArray(ed[key])) return ed[key];
  return specBuiltin(gameId, cat);
}
function sellSpecKey(f){
  const g = (document.getElementById('sellGame')||{}).value||'', c = (document.getElementById('sellCategory')||{}).value||'';
  return g+'|'+c+'|'+f.k;
}
function renderSellSpecs(){
  const box = document.getElementById('sellSpecs'); if(!box) return;
  const g = (document.getElementById('sellGame')||{}).value||'', c = (document.getElementById('sellCategory')||{}).value||'Аккаунты';
  sellDraft.specs = sellDraft.specs || {};
  if(!g){ box.innerHTML = `<div class="faint" style="font-size:12px;margin-bottom:16px;padding-left:2px;">Выберите игру, и здесь появятся её характеристики: ранг, уровень, скины и другое. Все поля обязательны.</div>`; return; }
  const fields = specFields(g,c);
  if(!fields.length){ box.innerHTML = ''; return; }
  box.innerHTML = `<div class="section-title">Характеристики <span class="faint" style="font-weight:500;">(все поля обязательны)</span></div>
  <div class="card" style="padding:12px 14px;margin-bottom:16px;display:flex;flex-direction:column;gap:12px;">
    ${fields.map(f=>{
      const key = g+'|'+c+'|'+f.k, v = sellDraft.specs[key]!==undefined ? sellDraft.specs[key] : '';
      let inp;
      if(f.t==='sel') inp = `<select class="select" data-sk="${f.k}" onchange="sellSpecSet('${key}',this.value,this)"><option value="">Выберите</option>${f.o.map(o=>`<option value="${esc(o)}"${o===v?' selected':''}>${esc(o)}</option>`).join('')}</select>`;
      else if(f.t==='num') inp = `<input class="input" type="number" inputmode="numeric" min="0" data-sk="${f.k}" placeholder="0" value="${esc(String(v))}" oninput="sellSpecSet('${key}',this.value,this)">`;
      else inp = `<input class="input" type="text" maxlength="80" data-sk="${f.k}" placeholder="${esc(f.ph||'')}" value="${esc(String(v))}" oninput="sellSpecSet('${key}',this.value,this)">`;
      return `<div><div class="faint" style="font-size:11.5px;margin-bottom:5px;padding-left:2px;">${esc(f.label)}</div>${inp}</div>`;
    }).join('')}
  </div>`;
}
function sellSpecSet(key, val, el){
  sellDraft.specs = sellDraft.specs || {};
  sellDraft.specs[key] = val;
  if(el) el.style.borderColor = '';
}
/* проверка и сбор характеристик; возвращает массив или null */
function collectSellSpecs(gameId, cat){
  const fields = specFields(gameId, cat), out = [];
  const specs = sellDraft.specs || {};
  for(const f of fields){
    let v = specs[gameId+'|'+cat+'|'+f.k]; v = v===undefined ? '' : String(v).trim();
    let bad = false;
    if(f.t==='sel') bad = !v;
    else if(f.t==='num') bad = v==='' || !isFinite(Number(v)) || Number(v)<0;
    else bad = v.length<2;
    if(bad){
      toast('Укажите: '+f.label,'error');
      const el = document.querySelector('#sellSpecs [data-sk="'+f.k+'"]');
      if(el){ el.style.borderColor = 'var(--danger)'; try{ el.scrollIntoView({block:'center',behavior:'smooth'}); }catch(e){} }
      return null;
    }
    out.push({k:f.k, label:f.label, value: f.t==='num' ? Number(v).toLocaleString('ru-RU') : v});
  }
  return out;
}
function specsHTML(l, compact){
  if(!l || !Array.isArray(l.specs) || !l.specs.length) return '';
  return `<div class="card" style="padding:${compact?'10px 12px':'12px 14px'};margin-bottom:${compact?'10':'14'}px;">
    ${compact?'':`<div class="section-title" style="margin-bottom:8px;">Характеристики</div>`}
    <div style="display:grid;grid-template-columns:1fr 1fr;gap:10px 12px;">
      ${l.specs.map(x=>`<div style="min-width:0;"><div class="faint" style="font-size:10.5px;">${esc(x.label)}</div><div style="font-size:13px;font-weight:700;word-break:break-word;">${esc(x.value)}</div></div>`).join('')}
    </div>
  </div>`;
}

