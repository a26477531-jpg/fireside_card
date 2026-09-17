// 31 張卡牌的繁體中文資料，沿用 window.CARDS 格式。
// name：卡牌名稱。abilities：每項技能的 title（標題）及 text（完整效果）。
// rulesText：已合併全部技能標題與效果的卡面文字，使用換行分隔。
// 顯示卡面規則時請使用 rulesText，或同時顯示 abilities 的 title 與 text。
// 網頁顯示 rulesText 時可搭配 CSS white-space: pre-line 保留換行。
// collection 沿用網站的展示分組；數值與技能依既有卡牌資料保留。
// nameLayout：名稱框中心與尺寸為百分比，fontSize 為卡寬百分比；逐張目視校正。
window.CARDS = [
  {
    "id": "01",
    "name": "魚人酋長",
    "slug": "murloc-chief",
    "mana": 5,
    "attack": 5,
    "health": 7,
    "subtitle": "潮鱗統領",
    "abilities": [
      {
        "title": "登場｜部族號令",
        "text": "使另一名友方怪獸獲得 +2 戰鬥值，持續至回合結束。"
      },
      {
        "title": "被動｜潮鱗護衛",
        "text": "你的回合結束時，使另一名友方怪獸獲得 1 點護盾。"
      }
    ],
    "image": "cards-clean-layout-31/01-murloc-chief.png",
    "collection": "深海軍團",
    "rulesText": "登場｜部族號令\n使另一名友方怪獸獲得 +2 戰鬥值，持續至回合結束。\n\n被動｜潮鱗護衛\n你的回合結束時，使另一名友方怪獸獲得 1 點護盾。",
    "nameLayout": {
      "centerX": 50,
      "centerY": 57.292,
      "width": 74,
      "height": 5.599,
      "fontSize": 6
    },
    "rulesLayout": {
      "top": 64.128,
      "height": 23.112,
      "notchStart": 54.93,
      "sideInset": 24
    }
  },
  {
    "id": "02",
    "name": "骷髏士兵",
    "slug": "skeleton-soldier",
    "mana": 2,
    "attack": 3,
    "health": 2,
    "subtitle": "朽刃守衛",
    "abilities": [
      {
        "title": "被動｜亡骨復起",
        "text": "此怪獸第一次被擊敗時，以 1 點血量復活。"
      }
    ],
    "image": "cards-clean-layout-31/02-skeleton-soldier.png",
    "collection": "暗影領域",
    "rulesText": "被動｜亡骨復起\n此怪獸第一次被擊敗時，以 1 點血量復活。",
    "nameLayout": {
      "centerX": 50,
      "centerY": 56.38,
      "width": 70,
      "height": 5.859,
      "fontSize": 6
    },
    "rulesLayout": {
      "top": 63.477,
      "height": 22.135,
      "notchStart": 66.18,
      "sideInset": 24
    }
  },
  {
    "id": "03",
    "name": "食屍鬼",
    "slug": "ghoul",
    "mana": 3,
    "attack": 4,
    "health": 4,
    "subtitle": "墓園飢客",
    "abilities": [
      {
        "title": "被動｜腐宴",
        "text": "此怪獸擊敗敵方怪獸後，恢復自身 2 點血量。"
      }
    ],
    "image": "cards-clean-layout-31/03-ghoul.png",
    "collection": "暗影領域",
    "rulesText": "被動｜腐宴\n此怪獸擊敗敵方怪獸後，恢復自身 2 點血量。",
    "nameLayout": {
      "centerX": 50,
      "centerY": 57.161,
      "width": 76,
      "height": 5.729,
      "fontSize": 6
    },
    "rulesLayout": {
      "top": 63.802,
      "height": 24.414,
      "notchStart": 53.33,
      "sideInset": 24
    }
  },
  {
    "id": "04",
    "name": "巨槌大兵",
    "slug": "greatmaul-soldier",
    "mana": 5,
    "attack": 7,
    "health": 6,
    "subtitle": "破陣重錘",
    "abilities": [
      {
        "title": "登場｜碎甲重擊",
        "text": "移除一名敵方怪獸的所有護盾。"
      }
    ],
    "image": "cards-clean-layout-31/04-greatmaul-soldier.png",
    "collection": "荒野之盟",
    "rulesText": "登場｜碎甲重擊\n移除一名敵方怪獸的所有護盾。",
    "nameLayout": {
      "centerX": 50,
      "centerY": 57.161,
      "width": 76,
      "height": 5.859,
      "fontSize": 6
    },
    "rulesLayout": {
      "top": 63.802,
      "height": 24.089,
      "notchStart": 55.41,
      "sideInset": 24
    }
  },
  {
    "id": "05",
    "name": "獨眼雙頭巨人",
    "slug": "two-headed-cyclops",
    "mana": 8,
    "attack": 10,
    "health": 11,
    "subtitle": "裂山雙顱",
    "abilities": [
      {
        "title": "被動｜雙顱猛攻",
        "text": "每回合第一次攻擊後，對同一目標再造成 2 點傷害。"
      }
    ],
    "image": "cards-clean-layout-31/05-two-headed-cyclops.png",
    "collection": "荒野之盟",
    "rulesText": "被動｜雙顱猛攻\n每回合第一次攻擊後，對同一目標再造成 2 點傷害。",
    "nameLayout": {
      "centerX": 50,
      "centerY": 57.682,
      "width": 76,
      "height": 5.339,
      "fontSize": 6
    },
    "rulesLayout": {
      "top": 65.104,
      "height": 23.438,
      "notchStart": 58.33,
      "sideInset": 24
    }
  },
  {
    "id": "06",
    "name": "地精商人",
    "slug": "goblin-merchant",
    "mana": 2,
    "attack": 1,
    "health": 4,
    "subtitle": "金袋掮客",
    "abilities": [
      {
        "title": "登場｜奇貨交易",
        "text": "抽 1 張牌。"
      }
    ],
    "image": "cards-clean-layout-31/06-goblin-merchant.png",
    "collection": "荒野之盟",
    "rulesText": "登場｜奇貨交易\n抽 1 張牌。",
    "nameLayout": {
      "centerX": 50,
      "centerY": 55.469,
      "width": 70,
      "height": 5.99,
      "fontSize": 6
    },
    "rulesLayout": {
      "top": 61.849,
      "height": 26.042,
      "notchStart": 62.5,
      "sideInset": 24
    }
  },
  {
    "id": "07",
    "name": "赤牙獸人",
    "slug": "redtusk-orc",
    "mana": 4,
    "attack": 6,
    "health": 5,
    "subtitle": "血誓鬥士",
    "abilities": [
      {
        "title": "被動｜赤牙狂怒",
        "text": "自身血量為 3 點以下時，戰鬥值增加 2 點。"
      }
    ],
    "image": "cards-clean-layout-31/07-redtusk-orc.png",
    "collection": "荒野之盟",
    "rulesText": "被動｜赤牙狂怒\n自身血量為 3 點以下時，戰鬥值增加 2 點。",
    "nameLayout": {
      "centerX": 50,
      "centerY": 56.771,
      "width": 72,
      "height": 5.469,
      "fontSize": 6
    },
    "rulesLayout": {
      "top": 63.802,
      "height": 22.135,
      "notchStart": 52.94,
      "sideInset": 24
    }
  },
  {
    "id": "08",
    "name": "鹿角部族薩滿",
    "slug": "antler-shaman",
    "mana": 4,
    "attack": 3,
    "health": 6,
    "subtitle": "林靈引路人",
    "abilities": [
      {
        "title": "登場｜林靈恩賜",
        "text": "使一名友方怪獸恢復 3 點血量。"
      },
      {
        "title": "被動｜枝葉庇護",
        "text": "你的回合結束時，使自身獲得 1 點護盾。"
      }
    ],
    "image": "cards-clean-layout-31/08-antler-shaman.png",
    "collection": "荒野之盟",
    "rulesText": "登場｜林靈恩賜\n使一名友方怪獸恢復 3 點血量。\n\n被動｜枝葉庇護\n你的回合結束時，使自身獲得 1 點護盾。",
    "nameLayout": {
      "centerX": 50,
      "centerY": 54.167,
      "width": 76,
      "height": 5.99,
      "fontSize": 6
    },
    "rulesLayout": {
      "top": 59.896,
      "height": 25.391,
      "notchStart": 58.97,
      "sideInset": 24
    }
  },
  {
    "id": "09",
    "name": "狼騎劫掠者",
    "slug": "wolf-raider",
    "mana": 5,
    "attack": 6,
    "health": 5,
    "subtitle": "疾牙掠影",
    "abilities": [
      {
        "title": "被動｜突襲",
        "text": "登場的回合即可攻擊。"
      }
    ],
    "image": "cards-clean-layout-31/09-wolf-raider.png",
    "collection": "荒野之盟",
    "rulesText": "被動｜突襲\n登場的回合即可攻擊。",
    "nameLayout": {
      "centerX": 50,
      "centerY": 58.333,
      "width": 76,
      "height": 5.729,
      "fontSize": 6
    },
    "rulesLayout": {
      "top": 64.453,
      "height": 22.786,
      "notchStart": 60,
      "sideInset": 24
    }
  },
  {
    "id": "10",
    "name": "豺狼人獵頭者",
    "slug": "gnoll-headhunter",
    "mana": 4,
    "attack": 5,
    "health": 4,
    "subtitle": "荒原追獵者",
    "abilities": [
      {
        "title": "登場｜獵首標記",
        "text": "對一名已受傷的敵方怪獸造成 2 點傷害。"
      }
    ],
    "image": "cards-clean-layout-31/10-gnoll-headhunter.png",
    "collection": "荒野之盟",
    "rulesText": "登場｜獵首標記\n對一名已受傷的敵方怪獸造成 2 點傷害。",
    "nameLayout": {
      "centerX": 50,
      "centerY": 55.339,
      "width": 72,
      "height": 4.948,
      "fontSize": 5.6
    },
    "rulesLayout": {
      "top": 61.523,
      "height": 24.414,
      "notchStart": 60,
      "sideInset": 24
    }
  },
  {
    "id": "11",
    "name": "空心樹人",
    "slug": "hollow-treant",
    "mana": 5,
    "attack": 3,
    "health": 10,
    "subtitle": "古林空殼",
    "abilities": [
      {
        "title": "被動｜嘲諷",
        "text": "敵方必須優先攻擊此怪獸。"
      },
      {
        "title": "被動｜老樹新生",
        "text": "你的回合開始時，恢復自身 1 點血量。"
      }
    ],
    "image": "cards-clean-layout-31/11-hollow-treant.png",
    "collection": "荒野之盟",
    "rulesText": "被動｜嘲諷\n敵方必須優先攻擊此怪獸。\n\n被動｜老樹新生\n你的回合開始時，恢復自身 1 點血量。",
    "nameLayout": {
      "centerX": 50,
      "centerY": 56.12,
      "width": 70,
      "height": 5.469,
      "fontSize": 6
    },
    "rulesLayout": {
      "top": 62.174,
      "height": 25.065,
      "notchStart": 58.44,
      "sideInset": 24
    }
  },
  {
    "id": "12",
    "name": "月蛾妖精",
    "slug": "moonmoth-fae",
    "mana": 3,
    "attack": 2,
    "health": 4,
    "subtitle": "銀翼織夢者",
    "abilities": [
      {
        "title": "登場｜月粉迷夢",
        "text": "使一名敵方怪獸的戰鬥值降低 2 點，持續至你的下個回合開始。"
      }
    ],
    "image": "cards-clean-layout-31/12-moonmoth-fae.png",
    "collection": "荒野之盟",
    "rulesText": "登場｜月粉迷夢\n使一名敵方怪獸的戰鬥值降低 2 點，持續至你的下個回合開始。",
    "nameLayout": {
      "centerX": 50,
      "centerY": 58.984,
      "width": 74,
      "height": 5.99,
      "fontSize": 6
    },
    "rulesLayout": {
      "top": 65.43,
      "height": 23.763,
      "notchStart": 53.42,
      "sideInset": 24
    }
  },
  {
    "id": "13",
    "name": "魚人潮汐祭司",
    "slug": "tide-priest",
    "mana": 4,
    "attack": 3,
    "health": 6,
    "subtitle": "迴潮祈者",
    "abilities": [
      {
        "title": "登場｜回潮治癒",
        "text": "使所有友方怪獸恢復 1 點血量。"
      },
      {
        "title": "被動｜潮汐祝禱",
        "text": "你的回合結束時，使自身恢復 1 點血量。"
      }
    ],
    "image": "cards-clean-layout-31/13-tide-priest.png",
    "collection": "深海軍團",
    "rulesText": "登場｜回潮治癒\n使所有友方怪獸恢復 1 點血量。\n\n被動｜潮汐祝禱\n你的回合結束時，使自身恢復 1 點血量。",
    "nameLayout": {
      "centerX": 50,
      "centerY": 54,
      "width": 72,
      "height": 4.818,
      "fontSize": 5.6
    },
    "rulesLayout": {
      "top": 61.198,
      "height": 26.693,
      "notchStart": 60.98,
      "sideInset": 24
    }
  },
  {
    "id": "14",
    "name": "蟹甲角鬥士",
    "slug": "crab-gladiator",
    "mana": 5,
    "attack": 5,
    "health": 8,
    "subtitle": "鉗鋒鬥將",
    "abilities": [
      {
        "title": "登場｜甲殼防禦",
        "text": "獲得 3 點護盾，優先抵擋傷害。"
      }
    ],
    "image": "cards-clean-layout-31/14-crab-gladiator.png",
    "collection": "深海軍團",
    "rulesText": "登場｜甲殼防禦\n獲得 3 點護盾，優先抵擋傷害。",
    "nameLayout": {
      "centerX": 50,
      "centerY": 55.859,
      "width": 76,
      "height": 6.641,
      "fontSize": 6
    },
    "rulesLayout": {
      "top": 62.5,
      "height": 26.042,
      "notchStart": 60,
      "sideInset": 24
    }
  },
  {
    "id": "15",
    "name": "沉船寄居怪",
    "slug": "shipwreck-hermit",
    "mana": 7,
    "attack": 6,
    "health": 12,
    "subtitle": "殘骸背負者",
    "abilities": [
      {
        "title": "被動｜嘲諷",
        "text": "敵方必須優先攻擊此怪獸。"
      },
      {
        "title": "登場｜殘船護殼",
        "text": "獲得 2 點護盾，優先抵擋傷害。"
      }
    ],
    "image": "cards-clean-layout-31/15-shipwreck-hermit.png",
    "collection": "深海軍團",
    "rulesText": "被動｜嘲諷\n敵方必須優先攻擊此怪獸。\n\n登場｜殘船護殼\n獲得 2 點護盾，優先抵擋傷害。",
    "nameLayout": {
      "centerX": 50,
      "centerY": 58.724,
      "width": 72,
      "height": 5.729,
      "fontSize": 6
    },
    "rulesLayout": {
      "top": 64.779,
      "height": 22.135,
      "notchStart": 60.29,
      "sideInset": 24
    }
  },
  {
    "id": "16",
    "name": "溺亡水手",
    "slug": "drowned-sailor",
    "mana": 3,
    "attack": 3,
    "health": 5,
    "subtitle": "幽潮歸客",
    "abilities": [
      {
        "title": "登場｜冰冷拖曳",
        "text": "使一名敵方怪獸的戰鬥值降低 1 點，持續至你的下個回合開始。"
      }
    ],
    "image": "cards-clean-layout-31/16-drowned-sailor.png",
    "collection": "深海軍團",
    "rulesText": "登場｜冰冷拖曳\n使一名敵方怪獸的戰鬥值降低 1 點，持續至你的下個回合開始。",
    "nameLayout": {
      "centerX": 50,
      "centerY": 56.12,
      "width": 74,
      "height": 5.599,
      "fontSize": 6
    },
    "rulesLayout": {
      "top": 62.5,
      "height": 22.786,
      "notchStart": 57.14,
      "sideInset": 24
    }
  },
  {
    "id": "17",
    "name": "礁岩海妖",
    "slug": "reef-siren",
    "mana": 5,
    "attack": 4,
    "health": 7,
    "subtitle": "碎浪歌者",
    "abilities": [
      {
        "title": "登場｜惑心歌聲",
        "text": "使一名敵方怪獸無法攻擊，持續至你的下個回合開始。"
      }
    ],
    "image": "cards-clean-layout-31/17-reef-siren.png",
    "collection": "深海軍團",
    "rulesText": "登場｜惑心歌聲\n使一名敵方怪獸無法攻擊，持續至你的下個回合開始。",
    "nameLayout": {
      "centerX": 50,
      "centerY": 57.292,
      "width": 70,
      "height": 5.729,
      "fontSize": 6
    },
    "rulesLayout": {
      "top": 63.802,
      "height": 26.042,
      "notchStart": 45,
      "sideInset": 24
    }
  },
  {
    "id": "18",
    "name": "灰燼獵犬",
    "slug": "ash-hound",
    "mana": 3,
    "attack": 4,
    "health": 3,
    "subtitle": "燼野追蹤者",
    "abilities": [
      {
        "title": "被動｜突襲",
        "text": "登場的回合即可攻擊。"
      },
      {
        "title": "被動｜餘火",
        "text": "被擊敗時，對一名敵方怪獸造成 1 點傷害。"
      }
    ],
    "image": "cards-clean-layout-31/18-ash-hound.png",
    "collection": "暗影領域",
    "rulesText": "被動｜突襲\n登場的回合即可攻擊。\n\n被動｜餘火\n被擊敗時，對一名敵方怪獸造成 1 點傷害。",
    "nameLayout": {
      "centerX": 50,
      "centerY": 54.557,
      "width": 76,
      "height": 6.12,
      "fontSize": 6
    },
    "rulesLayout": {
      "top": 60.872,
      "height": 27.669,
      "notchStart": 57.65,
      "sideInset": 24
    }
  },
  {
    "id": "19",
    "name": "鏡面魅魔",
    "slug": "mirror-succubus",
    "mana": 5,
    "attack": 5,
    "health": 6,
    "subtitle": "映魂惑使",
    "abilities": [
      {
        "title": "被動｜鏡面反射",
        "text": "每回合第一次受到攻擊後，對攻擊者造成 2 點傷害。"
      }
    ],
    "image": "cards-clean-layout-31/19-mirror-succubus.png",
    "collection": "暗影領域",
    "rulesText": "被動｜鏡面反射\n每回合第一次受到攻擊後，對攻擊者造成 2 點傷害。",
    "nameLayout": {
      "centerX": 50,
      "centerY": 57.943,
      "width": 72,
      "height": 5.729,
      "fontSize": 6
    },
    "rulesLayout": {
      "top": 63.802,
      "height": 24.414,
      "notchStart": 56,
      "sideInset": 24
    }
  },
  {
    "id": "20",
    "name": "硫磺公爵",
    "slug": "sulfur-duke",
    "mana": 8,
    "attack": 8,
    "health": 10,
    "subtitle": "煉獄貴胄",
    "abilities": [
      {
        "title": "登場｜硫火敕令",
        "text": "對所有敵方怪獸造成 2 點傷害。"
      },
      {
        "title": "被動｜公爵威儀",
        "text": "你的回合結束時，使另一名友方怪獸獲得 1 點護盾。"
      }
    ],
    "image": "cards-clean-layout-31/20-sulfur-duke.png",
    "collection": "暗影領域",
    "rulesText": "登場｜硫火敕令\n對所有敵方怪獸造成 2 點傷害。\n\n被動｜公爵威儀\n你的回合結束時，使另一名友方怪獸獲得 1 點護盾。",
    "nameLayout": {
      "centerX": 50,
      "centerY": 57.161,
      "width": 76,
      "height": 5.469,
      "fontSize": 6
    },
    "rulesLayout": {
      "top": 63.477,
      "height": 26.367,
      "notchStart": 58.02,
      "sideInset": 24
    }
  },
  {
    "id": "21",
    "name": "鐐銬獄卒",
    "slug": "shackle-jailer",
    "mana": 5,
    "attack": 4,
    "health": 9,
    "subtitle": "鐵牢看守",
    "abilities": [
      {
        "title": "被動｜嘲諷",
        "text": "敵方必須優先攻擊此怪獸。"
      },
      {
        "title": "登場｜鎖鏈束縛",
        "text": "使一名敵方怪獸的戰鬥值降低 2 點，持續至你的下個回合開始。"
      }
    ],
    "image": "cards-clean-layout-31/21-shackle-jailer.png",
    "collection": "暗影領域",
    "rulesText": "被動｜嘲諷\n敵方必須優先攻擊此怪獸。\n\n登場｜鎖鏈束縛\n使一名敵方怪獸的戰鬥值降低 2 點，持續至你的下個回合開始。",
    "nameLayout": {
      "centerX": 50,
      "centerY": 59.505,
      "width": 74,
      "height": 5.599,
      "fontSize": 6
    },
    "rulesLayout": {
      "top": 65.43,
      "height": 24.089,
      "notchStart": 55.41,
      "sideInset": 24
    }
  },
  {
    "id": "22",
    "name": "石化雞蛇",
    "slug": "cockatrice",
    "mana": 4,
    "attack": 4,
    "health": 5,
    "subtitle": "凝視災禽",
    "abilities": [
      {
        "title": "被動｜石化凝視",
        "text": "此怪獸攻擊後，使目標無法攻擊，持續至你的下個回合開始。"
      }
    ],
    "image": "cards-clean-layout-31/22-cockatrice.png",
    "collection": "荒野之盟",
    "rulesText": "被動｜石化凝視\n此怪獸攻擊後，使目標無法攻擊，持續至你的下個回合開始。",
    "nameLayout": {
      "centerX": 50,
      "centerY": 59.245,
      "width": 72,
      "height": 5.599,
      "fontSize": 6
    },
    "rulesLayout": {
      "top": 65.104,
      "height": 24.089,
      "notchStart": 56.76,
      "sideInset": 24
    }
  },
  {
    "id": "23",
    "name": "寶箱擬態怪",
    "slug": "chest-mimic",
    "mana": 4,
    "attack": 5,
    "health": 6,
    "subtitle": "貪金伏噬者",
    "abilities": [
      {
        "title": "被動｜伏擊利齒",
        "text": "每回合第一次受到攻擊後，對攻擊者造成 2 點傷害。"
      }
    ],
    "image": "cards-clean-layout-31/23-chest-mimic.png",
    "collection": "暗影領域",
    "rulesText": "被動｜伏擊利齒\n每回合第一次受到攻擊後，對攻擊者造成 2 點傷害。",
    "nameLayout": {
      "centerX": 50,
      "centerY": 53.516,
      "width": 72,
      "height": 4.818,
      "fontSize": 5.6
    },
    "rulesLayout": {
      "top": 59.57,
      "height": 27.669,
      "notchStart": 60,
      "sideInset": 24
    }
  },
  {
    "id": "24",
    "name": "矮人精靈",
    "slug": "dwarf-elf",
    "mana": 4,
    "attack": 5,
    "health": 8,
    "subtitle": "符石鍛造師",
    "abilities": [
      {
        "title": "登場｜符石護甲",
        "text": "獲得 2 點護盾，優先抵擋傷害。"
      },
      {
        "title": "戰吼｜鍛造之力",
        "text": "使另一名友方怪獸獲得 +1 戰鬥值。"
      }
    ],
    "image": "cards-clean-layout-31/24-dwarf-elf.png",
    "collection": "荒野之盟",
    "rulesText": "登場｜符石護甲\n獲得 2 點護盾，優先抵擋傷害。\n\n戰吼｜鍛造之力\n使另一名友方怪獸獲得 +1 戰鬥值。",
    "nameLayout": {
      "centerX": 50,
      "centerY": 56.51,
      "width": 70,
      "height": 5.729,
      "fontSize": 6
    },
    "rulesLayout": {
      "top": 63.151,
      "height": 22.786,
      "notchStart": 60,
      "sideInset": 24
    }
  },
  {
    "id": "25",
    "name": "克蘇魯",
    "slug": "cthulhu",
    "mana": 10,
    "attack": 9,
    "health": 12,
    "subtitle": "深淵沉睡者",
    "abilities": [
      {
        "title": "登場｜深淵低語",
        "text": "使所有敵方怪獸的戰鬥值降低 2 點，持續至你的下個回合開始。"
      },
      {
        "title": "被動｜古神再生",
        "text": "你的回合開始時，恢復自身 2 點血量。"
      }
    ],
    "image": "cards-clean-layout-31/25-cthulhu.png",
    "collection": "深海軍團",
    "rulesText": "登場｜深淵低語\n使所有敵方怪獸的戰鬥值降低 2 點，持續至你的下個回合開始。\n\n被動｜古神再生\n你的回合開始時，恢復自身 2 點血量。",
    "nameLayout": {
      "centerX": 50,
      "centerY": 57.161,
      "width": 72,
      "height": 5.599,
      "fontSize": 6
    },
    "rulesLayout": {
      "top": 64.128,
      "height": 21.81,
      "notchStart": 70.15,
      "sideInset": 24
    }
  },
  {
    "id": "26",
    "name": "維京狂戰士",
    "slug": "viking-berserker",
    "mana": 6,
    "attack": 7,
    "health": 8,
    "subtitle": "血怒雙斧",
    "abilities": [
      {
        "title": "被動｜浴血狂怒",
        "text": "自身血量為 4 點以下時，戰鬥值增加 3 點。"
      },
      {
        "title": "戰吼｜破盾猛擊",
        "text": "登場時，移除一名敵方怪獸的護盾。"
      }
    ],
    "image": "cards-clean-layout-31/26-viking-berserker.png",
    "collection": "荒野之盟",
    "rulesText": "被動｜浴血狂怒\n自身血量為 4 點以下時，戰鬥值增加 3 點。\n\n戰吼｜破盾猛擊\n登場時，移除一名敵方怪獸的護盾。",
    "nameLayout": {
      "centerX": 50,
      "centerY": 56.901,
      "width": 76,
      "height": 5.469,
      "fontSize": 6
    },
    "rulesLayout": {
      "top": 63.477,
      "height": 21.81,
      "notchStart": 55.22,
      "sideInset": 24
    }
  },
  {
    "id": "27",
    "name": "精靈使女",
    "slug": "elven-handmaiden",
    "mana": 3,
    "attack": 2,
    "health": 6,
    "subtitle": "晨露侍者",
    "abilities": [
      {
        "title": "登場｜晨露恩澤",
        "text": "使一名友方怪獸恢復 3 點血量。"
      },
      {
        "title": "被動｜靈葉守護",
        "text": "你的回合結束時，使另一名友方怪獸獲得 1 點護盾。"
      }
    ],
    "image": "cards-clean-layout-31/27-elven-handmaiden.png",
    "collection": "荒野之盟",
    "rulesText": "登場｜晨露恩澤\n使一名友方怪獸恢復 3 點血量。\n\n被動｜靈葉守護\n你的回合結束時，使另一名友方怪獸獲得 1 點護盾。",
    "nameLayout": {
      "centerX": 50,
      "centerY": 57.161,
      "width": 70,
      "height": 5.469,
      "fontSize": 6
    },
    "rulesLayout": {
      "top": 63.477,
      "height": 25.065,
      "notchStart": 55.84,
      "sideInset": 24
    }
  },
  {
    "id": "28",
    "name": "護盾石像鬼",
    "slug": "shield-gargoyle",
    "mana": 5,
    "attack": 3,
    "health": 12,
    "subtitle": "不動壁壘",
    "abilities": [
      {
        "title": "被動｜嘲諷",
        "text": "敵方必須優先攻擊此怪獸。"
      },
      {
        "title": "登場｜石化護盾",
        "text": "獲得 3 點護盾，優先抵擋傷害。"
      }
    ],
    "image": "cards-clean-layout-31/28-shield-gargoyle.png",
    "collection": "荒野之盟",
    "rulesText": "被動｜嘲諷\n敵方必須優先攻擊此怪獸。\n\n登場｜石化護盾\n獲得 3 點護盾，優先抵擋傷害。",
    "nameLayout": {
      "centerX": 50,
      "centerY": 57.161,
      "width": 76,
      "height": 5.859,
      "fontSize": 6
    },
    "rulesLayout": {
      "top": 64.779,
      "height": 23.112,
      "notchStart": 52.11,
      "sideInset": 24
    }
  },
  {
    "id": "29",
    "name": "地獄火巨人",
    "slug": "hellfire-giant",
    "mana": 8,
    "attack": 9,
    "health": 10,
    "subtitle": "熔核焚世者",
    "abilities": [
      {
        "title": "登場｜地獄烈焰",
        "text": "對所有敵方怪獸造成 2 點傷害。"
      },
      {
        "title": "被動｜熔火反噬",
        "text": "受到攻擊後，對攻擊者造成 1 點傷害。"
      }
    ],
    "image": "cards-clean-layout-31/29-hellfire-giant.png",
    "collection": "暗影領域",
    "rulesText": "登場｜地獄烈焰\n對所有敵方怪獸造成 2 點傷害。\n\n被動｜熔火反噬\n受到攻擊後，對攻擊者造成 1 點傷害。",
    "nameLayout": {
      "centerX": 50,
      "centerY": 56.38,
      "width": 76,
      "height": 5.469,
      "fontSize": 6
    },
    "rulesLayout": {
      "top": 63.802,
      "height": 25.391,
      "notchStart": 56.41,
      "sideInset": 24
    }
  },
  {
    "id": "30",
    "name": "雷霆薩滿法師",
    "slug": "thunder-shaman",
    "mana": 5,
    "attack": 4,
    "health": 7,
    "subtitle": "雷霆喚靈者",
    "abilities": [
      {
        "title": "登場｜雷霆震擊",
        "text": "對一名敵方怪獸造成 3 點傷害。"
      },
      {
        "title": "被動｜祖靈祝福",
        "text": "你的回合結束時，使一名友方怪獸恢復 1 點血量。"
      }
    ],
    "image": "cards-clean-layout-31/30-thunder-shaman.png",
    "collection": "荒野之盟",
    "rulesText": "登場｜雷霆震擊\n對一名敵方怪獸造成 3 點傷害。\n\n被動｜祖靈祝福\n你的回合結束時，使一名友方怪獸恢復 1 點血量。",
    "nameLayout": {
      "centerX": 50,
      "centerY": 54.297,
      "width": 76,
      "height": 5.599,
      "fontSize": 6,
      
    },
    "rulesLayout": {
      "top": 60.221,
      "height": 25.065,
      "notchStart": 53.25,
      "sideInset": 24
    }
  },
  {
    "id": "31",
    "name": "火蜥蜴圖騰",
    "slug": "fire-salamander-totem",
    "mana": 4,
    "attack": 2,
    "health": 7,
    "subtitle": "熾焰守望者",
    "abilities": [
      {
        "title": "被動｜餘燼脈動",
        "text": "你的回合結束時，對一名敵方怪獸造成 1 點傷害。"
      },
      {
        "title": "被動｜火靈庇護",
        "text": "你的回合開始時，使另一名友方怪獸獲得 1 點護盾。"
      }
    ],
    "image": "cards-clean-layout-31/31-fire-salamander-totem.png",
    "collection": "荒野之盟",
    "rulesText": "被動｜餘燼脈動\n你的回合結束時，對一名敵方怪獸造成 1 點傷害。\n\n被動｜火靈庇護\n你的回合開始時，使另一名友方怪獸獲得 1 點護盾。",
    "nameLayout": {
      "centerX": 50,
      "centerY": 55.99,
      "width": 74,
      "height": 5.729,
      "fontSize": 6
    },
    "rulesLayout": {
      "top": 62.5,
      "height": 26.693,
      "notchStart": 53.66,
      "sideInset": 24
    }
  }
];
