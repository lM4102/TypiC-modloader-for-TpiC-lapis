/**
 * @fileoverview TyPIC Mod Loader extension for Turbowarp. This extension allows users to easily create TPIC mods by providing blocks to create maps, drops, and custom sprites, as well as to manage game variables and events. This extension copies fragments of code of other extensions (Like ShovelUtils) and from Turbowarp's source code to make the mod loader work.
 */
/*LICENSE:
MIT License

Copyright (c) 2026 ModCode

Permission is hereby granted, free of charge, to any person obtaining a copy
of this software and associated documentation files (the "Software"), to deal
in the Software without restriction, including without limitation the rights
to use, copy, modify, merge, publish, distribute, sublicense, and/or sell
copies of the Software, and to permit persons to whom the Software is
furnished to do so, subject to the following conditions:

The above copyright notice and this permission notice shall be included in all
copies or substantial portions of the Software.

THE SOFTWARE IS PROVIDED "AS IS", WITHOUT WARRANTY OF ANY KIND, EXPRESS OR
IMPLIED, INCLUDING BUT NOT LIMITED TO THE WARRANTIES OF MERCHANTABILITY,
FITNESS FOR A PARTICULAR PURPOSE AND NONINFRINGEMENT. IN NO EVENT SHALL THE
AUTHORS OR COPYRIGHT HOLDERS BE LIABLE FOR ANY CLAIM, DAMAGES OR OTHER
LIABILITY, WHETHER IN AN ACTION OF CONTRACT, TORT OR OTHERWISE, ARISING FROM,
OUT OF OR IN CONNECTION WITH THE SOFTWARE OR THE USE OR OTHER DEALINGS IN THE
SOFTWARE.
*/
//Useful data: Scratch.BlockType.CONDITIONAL is a condition. To set the condition it requires a method with the same opcode that returns true or false.
/**
 * WARNING: Sprite clicking is still a bit buggy in the editor, but it works fine in the real game
 *
 */
(function (Scratch) {
  'use strict';

  if (!Scratch || typeof Scratch.extensions?.register !== 'function') {
    return;
  }

  let iframeOld = null;
  const JSZip = Scratch.vm.exports.JSZip;
  var zip = new JSZip();
  const zipDataURIPrefix = "data:application/zip;base64,"
  let mapIDs = new Set();
  let mapsSet = new Set();
  let teleportersSet = new Set();
  let dropsSet = new Set();
  let customSpritesSet = new Set();
  let modid = "myMod";
  let UIDs = new Set();
  const chars = ["a", "b", "c", "d", "e", "f", "g", "h", "j", "k", "l", "m", "n", "o", "p", "q", "r", "s", "t", "u", "v", "w", "x", "y", "z", ".", ",", "-", "(", ")", "[", "]"]
  function uid() {

    let string = "";
    for (let i = 0; i < 10; i++) {
      string = string.concat(chars[Math.ceil(Math.random() * chars.length)])
    }
    return string;
  }
  class TyPICModLoader {

    getInfo() {
      return {
        id: 'typicmodloader',
        name: 'TyPIC Mod Loader',
        blocks: [
          {
            opcode: 'exportZip',
            blockType: Scratch.BlockType.COMMAND,
            text: 'Export the mod as a zip file ready for the game',
          },
          {
            opcode: 'makeMap',
            blockType: Scratch.BlockType.COMMAND,
            text: 'Make map: shall load danger image?: [SHALLDANGER] with name [NAME], image [IMAGE], danger image [DANGER], music [MUSIC], background [BACKGROUND] and teleporter in [LOCATION] with x [POSX], y [POSY], image? [SHALLIMAGE], if true then image [DOORIMAGE], destination x [DESTX] and destination y [DESTY]',
            arguments: {
              SHALLDANGER: {
                type: Scratch.ArgumentType.STRING,
                menu: "booleanMenu"
              },
              NAME: {
                type: Scratch.ArgumentType.STRING,
              },
              IMAGE: {
                type: Scratch.ArgumentType.COSTUME,
              },
              DANGER: {
                type: Scratch.ArgumentType.COSTUME,
              },
              MUSIC: {
                type: Scratch.ArgumentType.SOUND,
              },
              BACKGROUND: {
                type: Scratch.ArgumentType.COSTUME,
              },
              LOCATION: {
                type: Scratch.ArgumentType.STRING,
                menu: "locationsMenu"
              },
              POSX: {
                type: Scratch.ArgumentType.NUMBER
              },
              POSY: {
                type: Scratch.ArgumentType.NUMBER
              },
              SHALLIMAGE: {
                type: Scratch.ArgumentType.STRING,
                menu: "booleanMenu"
              },
              DOORIMAGE: {
                type: Scratch.ArgumentType.COSTUME
              },
              DESTX: {
                type: Scratch.ArgumentType.NUMBER
              },
              DESTY: {
                type: Scratch.ArgumentType.NUMBER
              }
            }
          },
          {
            opcode: 'makeDrop',
            blockType: Scratch.BlockType.COMMAND,
            text: 'Make drop named [NAME] at [LOCATION] x: [PX] y: [PY] with image [IMAGE]',
            arguments: {
              NAME: {
                type: Scratch.ArgumentType.STRING
              },
              LOCATION: {
                type: Scratch.ArgumentType.STRING,
                menu: "locationsMenu"
              },
              PX: {
                type: Scratch.ArgumentType.NUMBER
              },
              PY: {
                type: Scratch.ArgumentType.NUMBER
              },
              IMAGE: {
                type: Scratch.ArgumentType.COSTUME
              }
            }
          },
          {
            opcode: 'makeCustomSprite',
            blockType: Scratch.BlockType.COMMAND,
            text: 'Make this sprite a custom sprite',
          },
          {
            opcode: 'closeGame',
            blockType: Scratch.BlockType.COMMAND,
            text: 'Close game',
          },
          {
            opcode: 'setupGame',
            blockType: Scratch.BlockType.COMMAND,
            text: 'Setup game',
          },
          {
            opcode: 'isFileLoaded',
            blockType: Scratch.BlockType.BOOLEAN,
            text: 'File loaded?',
          },
          {
            opcode: 'startGameDev',
            blockType: Scratch.BlockType.COMMAND,
            text: 'Start game ONLY FOR COMPILER',
            hideFromPalette: true
          },
          {
            blockType: Scratch.BlockType.EVENT,
            opcode: 'whenCompilerStarts',
            text: 'Startup event',
            hideFromPalette: true,
            isEdgeActivated: false,

          },
          {
            blockType: Scratch.BlockType.COMMAND,
            opcode: 'setModid',
            text: 'set modid to [MODID]',
            arguments: {
              MODID: {
                type: Scratch.ArgumentType.STRING
              }
            }
          },
          {
            blockType: Scratch.BlockType.EVENT,
            opcode: 'whenMapsRegistered',
            text: 'When map registration starts',
            isEdgeActivated: false,

          },
          {
            blockType: Scratch.BlockType.EVENT,
            opcode: 'whenDropsRegistered',
            text: 'When drop registration starts',
            isEdgeActivated: false,

          },
          {
            blockType: Scratch.BlockType.EVENT,
            opcode: 'whenCustomSpritesRegistered',
            text: 'When custom sprite registration starts',
            isEdgeActivated: false,

          },
          {
            blockType: Scratch.BlockType.COMMAND,
            opcode: 'StartGame',
            text: 'Start game compiler',

          },
          {
            blockType: Scratch.BlockType.COMMAND,
            opcode: 'registerMaps',
            text: 'Send whenMapsRegistered event',
            hideFromPalette: true
          },
          {
            blockType: Scratch.BlockType.COMMAND,
            opcode: 'registerDrops',
            text: 'Send whenDropsRegistered event',
            hideFromPalette: true
          },
          {
            blockType: Scratch.BlockType.COMMAND,
            opcode: 'registerDrops',
            text: 'Send whenDropsRegistered event',
            hideFromPalette: true
          },
          {
            blockType: Scratch.BlockType.COMMAND,
            opcode: 'registerCustomSprites',
            text: 'Send whenCustomSpritesRegistered event',
            hideFromPalette: true
          },
          {
            blockType: Scratch.BlockType.COMMAND,
            opcode: 'waitForIframe',
            text: 'wait for iframe',
            hideFromPalette: true
          },
          {
            blockType: Scratch.BlockType.COMMAND,
            opcode: 'waitForIframe2',
            text: 'wait for iframe 2',
            hideFromPalette: true
          },
          {
            blockType: Scratch.BlockType.COMMAND,
            opcode: 'setupZip',
            text: "setupZip",
            hideFromPalette: true
          },
          {
            blockType: "label",
            text: "Event placeholders",
          },
          {
            blockType: Scratch.BlockType.EVENT,
            opcode: 'whenflagclicked',
            text: 'when [FLAG] clicked',
            arguments: {
              FLAG: {
                type: Scratch.ArgumentType.IMAGE,
                dataURI: "data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAABgAAAAYCAMAAADXqc3KAAABFFBMVEUAAACAgABVqlVJkklAn0BNmTNLljxGlzpDmzdFmjpGmzxHmz9Fmj1FmT5Emj1GmT1GmD1EmDxGmTxEmT1GmjxGmT1FmDxEmT5EmTxGmT5FmD1GmT5FmT1Gmj1EmT5FmT1FmT1FmDxGmT1FmjxLs09LtE9Jr0xJsk1Js05JtVBKtU5KtVBKtlBJrkpJsE1KtlFIrEpIsExLt1FLuFJKuVNIqkhLulNIp0VJqkhKtlJLvVRMvFNFmT5GpUVFmT1HpEVHokNMvlVFmT1Ho0NFmTxLvlVGoUFMvlVLvlVGn0BFmT1Nv1ZEmz5FmTxFmTxFmT1NvlZFmz9FmT5FnT9FnD5GnT9Mv1ZMv1ZMv1ZFmT1Mv1b////70P2GAAAAWXRSTlMAAgMHCAoRFhcwMz0/RkdQVGFmaWpxcnh7gIGEhZKZo6eprLq/v8DAwMDAwMDBwcHCwsPDxcbIysrLzM3Pz9DQ1NTV1dfZ29vg4uXm5+jp6ens7fDx9Pv8/nPb5aAAAAABYktHRFt0vJU0AAAAsUlEQVQoz2NgwA3YhNiwS4hHykoou9goCrKiSUhGhqhZe7gbm3rxQwQ4BJihEupRYODooMDFyMAu6uMsgyoRFW5kHxjkqeuhL4cmAQM4JXRwSWjjktDEJaGFS0IVIeFtZuIaAZdQgUmY2/oqyTu5WcEkNGAS/kJMQJrbySAAJBxmGSoIlYAoYGCR8rPVM7QItuNlQJVgYGDlE5MU5kSErhz2+KCihEikNHYJJh5mBhIAADBcR/r5OJzCAAAAAElFTkSuQmCC"
              }
            },
            isEdgeActivated: false,
          },
          {
            blockType: Scratch.BlockType.EVENT,
            opcode: 'whenkeypressed',
            text: 'when [KEY_OPTION] key pressed',
            arguments: {
              KEY_OPTION: {
                type: Scratch.ArgumentType.STRING,
                menu: "keysMenu"
              }
            },
            isEdgeActivated: false,
          },
          {
            blockType: Scratch.BlockType.EVENT,
            opcode: 'whenthisspriteclicked',
            text: 'when this sprite clicked',
            isEdgeActivated: false
          },
          {
            blockType: Scratch.BlockType.EVENT,
            opcode: 'whenbackdropswitchesto',
            text: 'when backdrop switches to [BACKDROP]',
            arguments: {
              BACKDROP: {
                type: Scratch.ArgumentType.STRING,
                menu: "backdropMenu"
              }
            },
            isEdgeActivated: false
          },
          {
            blockType: Scratch.BlockType.EVENT,
            opcode: 'whengreaterthan',
            text: 'when [WHENGREATERTHANMENU] > [VALUE]',
            arguments: {
              WHENGREATERTHANMENU: {
                type: Scratch.ArgumentType.STRING,
                menu: "greaterThanMenu"
              },
              VALUE: {
                type: Scratch.ArgumentType.NUMBER
              }
            },
            isEdgeActivated: false
          },
          {
            blockType: Scratch.BlockType.EVENT,
            opcode: 'whenbroadcastreceived',
            text: 'when I receive [BROADCASTOPTION]',
            arguments: {
              BROADCASTOPTION: {
                type: Scratch.ArgumentType.STRING,
                menu: "broadcastMenu"
              }
            },
            isEdgeActivated: false
          },
          {
            blockType: Scratch.BlockType.REPORTER,
            opcode: 'broadcastMenu',
            text: 'message [BROADCASTOPTION]',
            arguments: {
              BROADCASTOPTION: {
                type: Scratch.ArgumentType.STRING,
                menu: "broadcastMenu"
              }
            },
            isEdgeActivated: false
          },
          {
            blockType: "label",
            text: "Variables"
          },
          {
            opcode: "varMenu",
            text: "variable [VAR]",
            blockType: Scratch.BlockType.REPORTER,
            arguments:
            {
              VAR: {
                type: Scratch.ArgumentType.STRING,
                menu: "varMenu"
              }
            }
          },
          {
            blockType: Scratch.BlockType.COMMAND,
            opcode: 'showVar',
            text: 'Show game variable [VAR]',
            arguments: {
              VAR: {
                type: Scratch.ArgumentType.STRING,
                menu: "varMenu",
              },
            }
          },
          {
            blockType: Scratch.BlockType.COMMAND,
            opcode: 'hideVar',
            text: 'Hide game variable [VAR]',
            arguments: {
              VAR: {
                type: Scratch.ArgumentType.STRING,
                menu: "varMenu",
              },
            }
          },
          {
            blockType: Scratch.BlockType.COMMAND,
            opcode: 'setVar',
            text: 'Set game variable [VAR] to [VALUE]',
            arguments: {
              VAR: {
                type: Scratch.ArgumentType.STRING,
                menu: "varMenu",
              },
              VALUE: {
                type: Scratch.ArgumentType.STRING
              }
            }
          },
          {
            blockType: Scratch.BlockType.COMMAND,
            opcode: 'changeVar',
            text: 'Change game variable [VAR] by [VALUE]',
            arguments: {
              VAR: {
                type: Scratch.ArgumentType.STRING,
                menu: "varMenu",
              },
              VALUE: {
                type: Scratch.ArgumentType.NUMBER
              }
            }
          },
          {
            blockType: "label",
            text: "Game sprites menu"
          },
          {
            blockType: Scratch.BlockType.REPORTER,
            opcode: 'spriteMenu',
            text: '[MENU]',
            arguments: {
              MENU: {
                type: Scratch.ArgumentType.STRING,
                menu: "gsMenu"
              }
            }
          }
        ],
        menus: {
          broadcastMenu: {
            acceptReporters: false,
            items: [
              "1.5 Completed",
              {text: "(MODLOADER) addSprites", value: "addSprites"},
              "baseplemp",
              "bossfight end",
              "calmgonow",
              "castle",
              "chaoslevel",
              "chaosstart",
              "choosfight end",
              "collections",
              "colorfallgonow",
              "copycats away",
              {text: "(MODLOADER) customgonow"},
              "drop end",
              "END (1/3)",
              "END (2/3)",
              "END (3/3)",
              "EVERYTHINGSONFIREEVERYTHINGSONFIRE",
              "ezobby",
              "f2gonow",
              "fakenowgo",
              "final fire",
              "finale",
              "glacierbgonow",
              "glaciergonow",
              "graygonow",
              "let the fun start",
              { text: "LoadMod (For Developers)", value: "LoadMod" },
              "minegonow",
              "new drop",
              "nowchaosssss",
              "outsideNOW",
              "parallelus",
              "purgatory",
              { text: "(MODLOADER) RegisterBase", value: "RegisterBase" },
              { text: "(MODLOADER) registerDrops", value: "registerDrops" },
              { text: "(MODLOADER) RegisterTeleporters", value: "RegisterTeleporters" },
              "ringingbellgonow",
              "roofgonow",
              "simplified game end",
              "skilly is died be sad oh no",
              "start",
              "wastedgtagonow",
              "you die.",
            ]
          },
          greaterThanMenu: {
            acceptReporters: false,
            items: [
              { text: "loudness", value: "LOUDNESS" },
              { text: "timer", value: "TIMER" },
            ]
          },
          backdropMenu: {
            acceptReporters: false,
            items: [
              "icons_550845",
            ]
          },
          varMenu: {
            acceptReporters: false,
            items: [
              "1-4",
              "Actual Level",
              "Alguem Tokens",
              "Attack Plan",
              "ChaosBossLives",
              "chaosdead?",
              "Deaths",
              "Drops Collected:",
              "Ending",
              "ExtremeDead?",
              "extremus",
              "FakeBossLives",
              "fakedead?",
              "Green Orbs",
              "inCustomLevel",
              "introremover",
              "Lives",
              "Location",
              "mapIn",
              "POWER",
              "Roll",
              "Score",
              "Show Data On Screen",
              "Show Pet",
              "Spam",
              "Swapped",
              "time",
              "timeattack",
              "Timer",
              "x:",
              "y:",
              "Your very own value."

            ]
          },
          locationsMenu: {
            acceptReporters: true,
            items: "locationsMenuItems"
          },
          booleanMenu: {
            acceptReporters: true,
            items: [
              "true",
              "false"
            ]
          },
          gsMenu: {
            acceptReporters: true,
            items: [
              "Skill-Drop",
              "maps//Base",
              "maps//Layer",
              "maps//Danger",
              "props//BackDrop",
              "props//lives",
              "props//score",
              "props//DropsThing",
              "props//Collectables",
              "props//cutscene",
              "props//pause screen",
              "props//title screen",
              "props//text window",
              "props//Green Orb No1",
              "props//Green Orb No2",
              "props//Green Orb No3",
              "props//Skill-Drop Assets",
              "props//Textbox",
              "props//Stairry = LevelEnd",
              "props//heeling heert",
              "props//Spiky Spike",
              "props//Alguem Token",
              "props//Aethereal Drops",
              "props//ypod (OST)",
              "props//Pet",
              "props//darkball",
              "drops//Lightning Drop",
              "drops//Fog Drop",
              "drops//Side Drop",
              "drops//Pin Drop",
              "drops//Guard Drop",
              "drops//90 Degree Drop",
              "drops//Pencil Drop",
              "drops//Fish Drop",
              "drops//FnadDrop",
              "drops//B-Drop",
              "drops//Donut Drop",
              "drops//Clover Drop",
              "drops//Dirt Drop",
              "drops//Hidden Orange Drop",
              "drops//Sad Drop",
              "drops//Chalk Drop",
              "drops//Bomb Drop",
              "drops//1-UP Drop",
              "drops//Blue Drop",
              "drops//P0IZ0N Drop",
              "drops//Drain Drop",
              "drops//Trunk Drop",
              "drops//Stairry the Drop",
              "drops//Musical Note Drop",
              "drops//Tempo Drop",
              "drops//Easy Drop",
              "drops//Normal Drop",
              "drops//Hard Drop",
              "drops//Harder Drop",
              "drops//Brick Drop",
              "drops//Paint Bucket Drop",
              "drops//Joystick Drop",
              "drops//XYBA Drop",
              "drops//Easy Demon Drop",
              "drops//Medium Demon Drop",
              "drops//Hard Demon Drop",
              "drops//Insane Demon Drop",
              "drops//Extreme Demon Drop",
              "drops//Chocolate Drop",
              "drops//Squill Derp",
              "drops//Abyss Drop",
              "drops//Winter Drop",
              "drops//Sun Drop",
              "drops//Underground Drop",
              "drops//Calm Drop",
              "drops//Insane Drop",
              "drops//Ringing Drop",
              "drops//Rainbow Drop",
              "drops//Fake Drop",
              "drops//Handsome Potato",
              "drops//Chaos Drop",
              "Teleporters//Ice Peaks Door (1)",
              "Teleporters//Deep Down Mine Door (2)",
              "Teleporters//Gray Abyss Door (3)",
              "Teleporters//Calm Valley Door (4)",
              "Teleporters//Rooftop (5)",
              "Teleporters//Wasteland (6)",
              "Teleporters//Floor 2 (F2)",
              "Teleporters//Floor 1 (F1)",
              "Teleporters//Castle Front Door (0)",
              "Teleporters//Parallel Castle Well (F-1)",
              "Teleporters//Ice Peaks B-Side (1.5)",
              "Teleporters//Basement",
              "Teleporters//Outside Door",
              "Teleporters//fakedropdoor",
              "Teleporters//final door",
              "Teleporters//chaosdropdoor",
              "Teleporters//truechaosdoor",
              "Teleporters// Ez Obby Door (6)",
              "Teleporters// Bell (7)",
              "Teleporters//Behind The Color Waterfall (8)",
              "Teleporters//Difficulty Scale Teleporter (9)",
              "Teleporters//Final Fire ",
              "Teleporters//1.6 Final Door",
              "TyPIC//Modloader",
              "TyPIC//DebugMode",
              "TyPIC//ModdedMap",
              "TyPIC//ModdedTeleporter",
              "TyPIC//ModdedDrop",
              "TyPIC//CustomScript",
            ]
          },
          keysMenu: {
            acceptReporters: false,
            items: [
              "space",
              "up arrow",
              "down arrow",
              "right arrow",
              "left arrow",
              "any",
              "a",
              "b",
              "c",
              "d",
              "e",
              "f",
              "g",
              "h",
              "i",
              "j",
              "k",
              "l",
              "m",
              "n",
              "o",
              "p",
              "q",
              "r",
              "s",
              "t",
              "u",
              "v",
              "w",
              "x",
              "y",
              "z",
              "0",
              "1",
              "2",
              "3",
              "4",
              "5",
              "6",
              "7",
              "8",
              "9"
            ]
          }
        }
      };
    }
    getVariableId(varName, varType) {
      if (iframeOld && iframeOld.contentWindow.Scratch && iframeOld.contentWindow.Scratch.vm && iframeOld.contentWindow.Scratch.vm.runtime && iframeOld.contentWindow.Scratch.vm.runtime.getTargetForStage()) {
        return iframeOld.contentWindow.Scratch.vm.runtime.getTargetForStage().lookupVariableByNameAndType(varName, varType).id;
      }
      switch (varName) {
        case 'FakeBossLives':
          return '=!|rmBny`C`}qc]Uy8TH';
        case 'timeattack':
          return '?]=./qP?$0I)A#%*eykG';
        case 'Swapped':
          return 'A[TV/gtSaOw:~ds8ha=C';
        case 'Lives':
          return '6I/t)XAHwI)Uk8Nf39%P';
        case 'Badges':
          return '6W3BsJe%}EUi/o0Rl;0X';
        case 'POWER':
          return '7)Jp:goujxN-S%Ht5}~6';
        case 'Location':
          return '(cA9zi)o.G03@HEX`Wj}';
        case 'introremover':
          return '-4]cN:JB7KHKL+JrKS0+';
        case 'x:':
          return 'BQmD3Q$-6X2f}9M;FUk-';
        case 'Your very own value.':
          return 'B]D2}6PP@)5s0l%B?P1E';
        case 'extremus':
          return 'F,E6j@FaoHSO2yZ}0)v?';
        case 'fakedead?':
          return 'LBq9GYxrKJg4,CAK-Y=R';
        case 'Green Orbs':
          return 'O|n=03C}6,1LF5jTGYN(';
        case 'chaosdead?':
          return 'S1]`fVG.QP7A~S[~(-JU';
        case 'Drops Collected:':
          return 'UScj;]qtzoU9Z,HTw^Po';
        case 'DropletDEX':
          return 'U~SFu,IqX[X;.HDC#AGe';
        case 'Attack Plan':
          return 'c_tZ(KDFpDCc/y|naq8!';
        case 'Actual Level':
          return 'dOUV+f;mGZZXHl++OG]`';
        case 'ChaosBossLives':
          return 'f|y^YUi%;WvgvyjRigG6';
        case 'Timer':
          return 'gS$ha/fGBBsOhRre@.UZ';
        case 'y:':
          return 'k^4x$/70,$cBf9Z4i1WE';
        case 'time':
          return 'oKo;-7w1M+RTFCj#Wx)a';
        case 'Ending':
          return 'o^h|uS]d+1*bUmNChuUB';
        case 'iteratorDroplets':
          return '#(=qR[|:nLy4q{_xz~v/';
        case 'iterator':
          return 'g/CC.g.5?#wvpK_+Y7cK';
        case 'mapIn':
          return 'qKq4|(cxis7cQ0^*P@|T';
        case 'inCustomLevel':
          return '%paVWYWTA4OJ!sGX~SJO';
        case 'registerDrops':
          return '02{j]PTF[nZbC;?sfK|Q';
        case 'RegisterBase':
          return '7c[3I=|J:zTc@4XhM5p*';
        case 'simplified game end':
          return '7xdF{d92`rQ2xxc@^YHr';
        case 'f2gonow':
          return '9_$u%4:t-x49{#pM(g=8';
        case 'calmgonow':
          return '$Fkv.-wdUtfz_$Kd$FDj';
        case 'glacierbgonow':
          return '%D0-kO%lM!(Yt4yo8a+K';
        case 'glaciergonow':
          return '%j`vFIau|zO_qA]l|/l3';
        case 'copycatsaway':
          return ':8/5JLdCIO~g6cDB=^m}';
        case 'chaosstart':
          return ':SsvFp7*^hm(jE-J8En+';
        case 'LoadMod':
          return '@DCG?0w:^~#9QolekbGI';
        case 'fakenowgo':
          return 'HEv+v?/]^IRFQ^s`U!Z#';
        case 'addSprites':
          return 'IPP7Sr;5dgZU[XwOeS!*';
        case 'choosfight end':
          return 'K6285LiK%egTcY3k]IF]';
        case 'timeattack':
          return 'N1NhO#.yrH0*$j|0M8zU';
        case 'finale':
          return 'Y)7Q398,q~H~g(]kOw[j';
        case 'collections':
          return 'Ztc,O_(|w938M![vvqh8';
        case 'roofgonow':
          return ']SwFd@*F2Y_]QuNX!kF,';
        case 'chaoslevel':
          return '^j5=%W{tFT}$q+]i(Ri%';
        case 'nowchaosssss':
          return 'a^[Hti~53-OlFJvckd?f';
        case 'parallelus':
          return 'cZ?*!y@!@[GBCZb/H7!Z';
        case 'castle':
          return 'cf[)AIHZehyujo?xkItc';
        case 'start':
          return 'cs`vorwX/N/9Jg?KMvy1';
        case 'customgonow':
          return 'd{L?.%x_iWnpI5leEE.l';
        case 'outsideNOW':
          return 'eHp{~U(t_^vbXS:w~,s-';
        case 'graygonow':
          return 'g;qX^|vPVU;;.??@,G4t';
        case 'skilly is died be sad oh no':
          return 'i%N_ll5:bPgK5/:hMRF!';
        case 'purgatory':
          return 'nqiOr0PfZ^kr/cc2x_J1';
        case 'let the fun start':
          return 'o,|oCe3gN@b@Hj#/`w(k';
        case 'you die.':
          return 'pN%_9{]_Z-qr#VRZvLAR';
        case 'minegonow':
          return 'pVtO~6]~J/f7kx68iA~t';
        case 'baseplemp':
          return 'vL]^=cG$jXa)n|7J-RwK';
        case 'bossfight end':
          return 'wEHlFYoc9jgH5P%D];X5';
        case 'green flag':
          return '}+cS(b${`00Q6p^SHtdQ';
        case 'END (1/3)':
          return 'vXIEAhLpf-Ev0[`{Aci-';
        case 'END (2/3)':
          return 'sGA3F`[]k{3y4HH/Tft/';
        case 'END (3/3)':
          return 'IUnrQ%0_hk.XX913W%4=';
        case 'Score':
          return 'ofPJ~?|/oO0J!Ve4C5@#';
        case 'Alguem Tokens':
          return '}g[eq[oZ)Y7}{Gc@%y^?';
        case 'Spam':
          return 'd}~:EDNzua?+G!s*z1sk';
        case 'Roll':
          return 'ez,u,E~Gsr56eb(@[eF`';
        case '1-4':
          return ';X![7gIL|-5_Ry+,iNNQ';
        case 'Show HUD':
          return 'CWXY1V{?7ItW2B?!,1W1';
        case 'Show Data On Screen':
          return 'Dm4?$,FI7f+:ZeD;}G([';
        case 'Pet Skin':
          return ']]^~)*TsXD(lY!RnaKy-';  
        case 'Show Pet':
          return '38q;knedvRq=-17ZA^Sh';
        case 'Deaths':
          return '?t#Ru)p;w|{+n*S5B;p9';
        case 'ExtremeDead?':
          return 'We#~b:_$!Mh^l|LvdY#Y';
        case 'MySkins':
          return 'Y9J(7%F~c9NwD?PD;K#D';
        case 'originalMaps':
          return '_8.x5k2QvmD(/Kxl[98$';
        case 'wastedgtagonow':
          return ',N-Lstny6oc#iSHb7jjJ';
        case 'ezobby':
          return 'MH4!Bp@j!aX5u?:wMOTJ';
        case 'new drop':
          return '|L@GxxEUKvkU?N)RIDa-';
        case 'drop end':
          return 'r3C-mCm9!V:gaAMdm9(h';
        case 'ringingbellnow':
          return 'nGBsuM=_uyQm;}]ozRWq';
        case 'colorfallgonow':
          return 'wV%2~oAY+chCUHYKlJk=';
        case '1.5 Completed':
          return 'vA6`%gSe:95*J#$-oT]+';
        case 'EVERYTHINGSONFIREEVERYTHINGSONFIRE':
          return ';=;zf?@[a~@e1`m24hDz';
        case 'final fire':
          return '?)hF(OF8vZXr=6ckvDX]'; 
        default:
          return uid();
      }
    }


    setModid(args) {
      modid = args.MODID;
    }
    /**
     * Gets a global Variable object 
     * @param {string} varName name of variable
     * @param {string} varType variable type ('' for normal, 'list' for list and 'broadcast_msg' for message)
     * @returns {Variable} variable
     */
    getVariable(varName, varType) {
      if (iframeOld && iframeOld.contentWindow.Scratch && iframeOld.contentWindow.Scratch.vm && iframeOld.contentWindow.Scratch.vm.runtime && iframeOld.contentWindow.Scratch.vm.runtime.getTargetForStage()) {
        return iframeOld.contentWindow.Scratch.vm.runtime.getTargetForStage().lookupVariableByNameAndType(varName, varType).value;
      }
      return null;
    }
    varMenu(args) {
      return this.getVariable(args.VAR, '');
    }
    spriteMenu(args) {
      return args.MENU;
    }
    broadcastMenu(args) {
      return args.BROADCASTOPTION;
    }
    exportZip() {
      return new Promise(async (resolve, reject) => {
        this.downloadFile(modid, await zip.generateAsync({ type: "blob", compression: "DEFLATE", compressionOptions: { level: 9 } }));
        resolve();
      })
    }
    /**
     * Download a blob file.
     * @param {string} filename The name of the file to download
     * @param {Blob} blob The blob representation of the file
     */
    downloadFile(filename, blob) {
      let link = document.createElement('a');
      document.body.appendChild(link);


      if (navigator.msSaveOrOpenBlob) {
        navigator.msSaveOrOpenBlob(blob, filename);
        return;
      }

      if ('download' in HTMLAnchorElement.prototype) {
        let objectUrl = window.URL.createObjectURL(blob);
        link.href = objectUrl;
        link.download = filename;
        link.type = blob.type;
        link.click();
        window.setTimeout(() => {
          document.body.removeChild(link);
          window.URL.revokeObjectURL(objectUrl);

        }, 1000);
      } else {
        let newTab = window.open('', '_blank');
        const reader = new FileReader();
        reader.onloadend = function () {
          newTab.location.href = reader.result;
          newTab = null;
        };
        reader.readAsDataURL(blob);
      }

    }
    /**
     * Returns the data URI representing the zip file
     * @return {string} The base64 data URI of the zip file
     */
    async getZipFile() {
      return zipDataURIPrefix + await zip.generateAsync({ type: "base64", compression: "DEFLATE", compressionOptions: { level: 9 } });
    }
    /**
     * Saves a sound of a target with its name and returns the path to be put in JSON
     * @param {string} soundName Name of the sound file
     * @param {Target} target Target that contains the sound file
     * @return {string} the path of the file inside the zip
     */
    saveSoundToZip(soundName, target) {
      let sound = null;
      for (let i = 0; i < target.sprite.sounds.length; i++) {
        console.log(target.sprite.sounds[i].name + " vs " + soundName);
        if (target.sprite.sounds[i].name == soundName) {
          sound = target.sprite.sounds[i];
          break;
        }
      }
      const blob = new Blob([sound.asset.data], { type: sound.asset.assetType.contentType });
      zip.file(modid + "/" + soundName + ".wav", blob);
      return modid + "/" + soundName + ".wav";
    }
    /**
     * Takes a costume name and a Sprite target and returns the data URI of the costume
     * @param {string} name Name of the costume
     * @param {Target} target Target that contains the costume
     * @return {string} The data URI representing the costume
     */
    costumeNameToDataURI(name, target) {
      let item = null;
      console.log(target.sprite);
      for (let i = 0; i < target.sprite.costumes_.length; i++) {
        let costume = target.sprite.costumes[i];
        console.log(costume.name + " CVS " + name);
        if (costume.name == name) {
          item = costume;
          break;
        }
      }
      const blob = new Blob([
        Scratch.vm.getExportedCostume(item)
      ], { type: item.asset.assetType.contentType });
      const reader = new FileReader();

      return new Promise((resolve, reject) => {
        reader.onloadend = function () {
          resolve(reader.result);
        };
        reader.onerror = function () {
          reject(reader.error);
        };
        reader.readAsDataURL(blob);
      });
    }
    /**
     * This method makes the drop JSON
     * @param {Object} args 
     * @param {BlockUtility} util 
     */
    async makeDrop(args, util) {
      return new Promise(async (resolve, reject) => {
        let target = util.thread.target;
        let image = await this.costumeNameToDataURI(args.IMAGE, target);
        let dropInfo = {
          id: Scratch.Cast.toString(args.NAME),
          image: image,
          position: {
            x: args.PX,
            y: args.PY
          },
          location: args.LOCATION
        }
        dropsSet.forEach((value) => {
          if (value.id == args.NAME) {
            dropsSet.delete(value);
          }
        })
        dropsSet.add(JSON.stringify(dropInfo));
        resolve();
      })
    }
    /**
     * This method makes the map and teleporter JSON and adds it to its respective category. Also this method puts the sound file into the zip
     * @param {Object} args 
     * @param {BlockUtility} util 
     */

    async makeMap(args, util) {
      return new Promise(async (resolve, reject) => {
        console.log("SRITE: " + JSON.stringify(util.thread.target));
        let target = util.thread.target;
        let data = await this.costumeNameToDataURI(args.IMAGE, target);
        let background = await this.costumeNameToDataURI(args.BACKGROUND, target);
        let danger = await this.costumeNameToDataURI(args.DANGER, target);

        let mapInfo = {
          "id": Scratch.Cast.toString(args.NAME),
          "data": data,
          "shallLoadDanger": Scratch.Cast.toBoolean(args.SHALLDANGER),

        }
        if (mapInfo.shallLoadDanger) {
          mapInfo.danger = danger
        }
        let teleporterInfo = {
          id: Scratch.Cast.toString(args.NAME) + "_teleporter",
          position: {
            x: args.POSX,
            y: args.POSY
          },
          destination: {
            id: Scratch.Cast.toString(args.NAME),
            x: args.DESTX,
            y: args.DESTY
          },
          location: args.LOCATION,
          background: background,
          music: this.saveSoundToZip(args.MUSIC, target)
        }

        mapsSet.forEach((value) => {
          if (value.id == args.NAME) {
            mapsSet.delete(value);
            mapIDs.delete(Scratch.Cast.toString(args.NAME))
          }
        })
        teleportersSet.forEach((value) => {
          if (value.id == Scratch.Cast.toString(args.NAME) + "_teleporter") {
            teleportersSet.delete(value);
          }
        }
        )

        mapIDs.add(args.NAME);
        mapsSet.add(JSON.stringify(mapInfo));
        teleportersSet.add(JSON.stringify(teleporterInfo));
        console.log(mapsSet.values().next().value);
        console.log(teleportersSet.values().next().value);
        resolve();
      })
    }
    makeCustomSprite(args, util) {
      const target = util.thread.target;
      //Most complicated part of the modloader, filter out the blocks that are for adding the sprite and changing the blocks that need to be changed to make the sprite work in the mod. Then export the sprite and add it to the zip file, and add its info to the customSpritesSet
      Scratch.vm.duplicateSprite(target.id).then(() => {

        let newTarget = Scratch.vm.runtime.getEditingTarget();
        console.log(JSON.stringify(newTarget.blocks._blocks))
        //Iterate through the blocks of the sprite
        Object.keys(newTarget.blocks._blocks).forEach((key) => {
          console.log("Block opcode: " + newTarget.blocks._blocks[key]);
          if (!newTarget.blocks._blocks[key]) {
            console.error("Block key: " + key + " doesn't exist");
            return;
          }
          if (newTarget.blocks._blocks[key].opcode == "typicmodloader_makeCustomSprite" || newTarget.blocks._blocks[key].opcode == "typicmodloader_whenCustomSpritesRegistered") {
            console.warn("Removing block " + newTarget.blocks._blocks[key].opcode + " from custom sprite because it is not needed.");
            newTarget.blocks.deleteBlock(key);
            return;
          } else {
            switch (newTarget.blocks._blocks[key].opcode) {
              case "typicmodloader_whenflagclicked":
                console.warn("WhenFlagClicked found: " + JSON.stringify(newTarget.blocks._blocks[key]), newTarget.blocks._blocks[key]);
                newTarget.blocks._blocks[key].opcode = "event_whenbroadcastreceived";
                newTarget.blocks._blocks[key].fields.BROADCAST_OPTION = { id: undefined, name: "BROADCAST_OPTION", value: "green flag" };
                break;
              case "typicmodloader_spriteMenu":
                console.warn("The Menu found: it routes to: " + JSON.stringify(newTarget.blocks._blocks[newTarget.blocks._blocks[key].parent]));
                Object.keys(newTarget.blocks._blocks[newTarget.blocks._blocks[key].parent].inputs).forEach((input) => {
                  if (newTarget.blocks._blocks[newTarget.blocks._blocks[key].parent].inputs[input].block === newTarget.blocks._blocks[key].id) {
                    newTarget.blocks._blocks[newTarget.blocks._blocks[key].parent].inputs[input].block = newTarget.blocks._blocks[newTarget.blocks._blocks[key].parent].inputs[input].shadow;
                    Object.keys(newTarget.blocks._blocks[newTarget.blocks._blocks[newTarget.blocks._blocks[key].parent].inputs[input].shadow].fields).forEach((field) => {
                      newTarget.blocks._blocks[newTarget.blocks._blocks[newTarget.blocks._blocks[key].parent].inputs[input].shadow].fields[field].value = newTarget.blocks._blocks[newTarget.blocks._blocks[key].inputs.MENU.block].fields.gsMenu.value;
                    })
                  }
                })
                //newTarget.blocks._blocks[newTarget.blocks._blocks[key].parent].fields.TO = {name: "TO", value: newTarget.blocks._blocks[newTarget.blocks._blocks[key].inputs.MENU.block].fields.gsMenu.value}
                console.warn("THe MEAnu: ", newTarget.blocks._blocks[newTarget.blocks._blocks[key].parent]);
                newTarget.blocks.deleteBlock(key);
                return;
                break;
              case "typicmodloader_varMenu":
                console.warn("The VMenu found");
                if (!newTarget.blocks._blocks[newTarget.blocks._blocks[key].parent]) { return; }
                Object.keys(newTarget.blocks._blocks[newTarget.blocks._blocks[key].parent].inputs).forEach((input) => {
                  if (newTarget.blocks._blocks[newTarget.blocks._blocks[key].parent].inputs[input].block === newTarget.blocks._blocks[key].id) {
                    newTarget.blocks._blocks[key].opcode = "data_variable";
                    newTarget.blocks._blocks[key].fields.VARIABLE = { name: "VARIABLE", id: this.getVariableId(newTarget.blocks._blocks[key].fields.VAR.value), variableType: "", value: newTarget.blocks._blocks[key].fields.VAR.value }

                    newTarget.blocks._blocks[newTarget.blocks._blocks[key].parent].inputs[input].block = newTarget.blocks._blocks[key].id;
                  }
                })
                break;
              case "typicmodloader_spriteMenu":
                console.warn("The BMenu found: it routes to: " + JSON.stringify(newTarget.blocks._blocks[newTarget.blocks._blocks[key].parent]));
                Object.keys(newTarget.blocks._blocks[newTarget.blocks._blocks[key].parent].inputs).forEach((input) => {
                  if (newTarget.blocks._blocks[newTarget.blocks._blocks[key].parent].inputs[input].block === newTarget.blocks._blocks[key].id) {
                    newTarget.blocks._blocks[newTarget.blocks._blocks[key].parent].inputs[input].block = newTarget.blocks._blocks[newTarget.blocks._blocks[key].parent].inputs[input].shadow;
                    Object.keys(newTarget.blocks._blocks[newTarget.blocks._blocks[newTarget.blocks._blocks[key].parent].inputs[input].shadow].fields).forEach((field) => {
                      newTarget.blocks._blocks[newTarget.blocks._blocks[newTarget.blocks._blocks[key].parent].inputs[input].shadow].fields[field] = {name: field,value: newTarget.blocks._blocks[key].fields.BROADCASTOPTION.value, variableType: "broadcast_msg",id: this.getVariableId(newTarget.blocks._blocks[key].fields.BROADCASTOPTION.value,"broadcast_msg")};
                    })
                  }
                })
                //newTarget.blocks._blocks[newTarget.blocks._blocks[key].parent].fields.TO = {name: "TO", value: newTarget.blocks._blocks[newTarget.blocks._blocks[key].inputs.MENU.block].fields.gsMenu.value}
                console.warn("THe BMenu: ", newTarget.blocks._blocks[newTarget.blocks._blocks[key].parent]);
                newTarget.blocks.deleteBlock(key);
                return;
                break;
              case "typicmodloader_showVar":
                console.log(newTarget.blocks._blocks[key].fields.VAR.value)
                newTarget.blocks._blocks[key].opcode = "data_showvariable";
                newTarget.blocks._blocks[key].fields.VARIABLE = { name: "VARIABLE", id: this.getVariableId(newTarget.blocks._blocks[key].fields.VAR.value), variableType: "", value: newTarget.blocks._blocks[key].fields.VAR.value }
                console.log(newTarget.blocks._blocks[key].fields.VARIABLE)
                break;
              case "typicmodloader_hideVar":
                console.log(newTarget.blocks._blocks[key].fields.VAR.value)
                newTarget.blocks._blocks[key].opcode = "data_hidevariable";
                newTarget.blocks._blocks[key].fields.VARIABLE = { name: "VARIABLE", id: this.getVariableId(newTarget.blocks._blocks[key].fields.VAR.value), variableType: "", value: newTarget.blocks._blocks[key].fields.VAR.value }
                console.log(newTarget.blocks._blocks[key].fields.VARIABLE)
                break;
              case "typicmodloader_setVar":
                console.log(newTarget.blocks._blocks[key].fields.VAR.value)
                newTarget.blocks._blocks[key].opcode = "data_setvariableto";
                newTarget.blocks._blocks[key].fields.VARIABLE = { name: "VARIABLE", id: this.getVariableId(newTarget.blocks._blocks[key].fields.VAR.value), variableType: "", value: newTarget.blocks._blocks[key].fields.VAR.value }
                console.log(newTarget.blocks._blocks[key].fields.VARIABLE)
                break;
              case "typicmodloader_changeVar":
                console.log(newTarget.blocks._blocks[key].fields.VAR.value)
                newTarget.blocks._blocks[key].opcode = "data_changevariableby";
                newTarget.blocks._blocks[key].fields.VARIABLE = { name: "VARIABLE", id: this.getVariableId(newTarget.blocks._blocks[key].fields.VAR.value), variableType: "", value: newTarget.blocks._blocks[key].fields.VAR.value }
                console.log(newTarget.blocks._blocks[key].fields.VARIABLE)
                break;
              case "typicmodloader_whenbroadcastreceived":
                newTarget.blocks._blocks[key].opcode = "event_whenbroadcastreceived"
                const BROADCASTOPTION1 = newTarget.blocks._blocks[key].fields.BROADCASTOPTION;
                newTarget.blocks._blocks[key].fields = { BROADCAST_OPTION: BROADCASTOPTION1 }
                break;
              case "typicmodloader_whenkeypressed":
                newTarget.blocks._blocks[key].opcode = "event_whenkeypressed";
                break;
              case "typicmodloader_whenthisspriteclicked":
                newTarget.blocks._blocks[key].opcode = "event_whenthisspriteclicked"
                break;
              case "typicmodloader_whengreaterthan":
                newTarget.blocks._blocks[key].opcode = "event_whengreaterthan";
                break;
            }
          }
        });
        let exportedSprite = Scratch.vm.exportSprite(newTarget.id);
        zip.file(modid + "/" + newTarget.sprite.name + ".sprite3", exportedSprite);

        let spriteInfo = {
          id: target.sprite.name,
          location: modid + "/" + newTarget.sprite.name + ".sprite3"
        };
        customSpritesSet.forEach((value) => {
          if (value.id == target.sprite.name) {
            customSpritesSet.delete(value);
          }
        })
        customSpritesSet.add(JSON.stringify(spriteInfo));
        Scratch.vm.deleteSprite(newTarget.id);
      });
    }

    /**
     * A copied method from scratch-gui/containers/sound-tab to make tests
     * @param {number} soundIndex 
     */
    handleExportSound(soundIndex) {
      const item = Scratch.vm.editingTarget.sprite.sounds[soundIndex];
      const blob = new Blob([item.asset.data], { type: item.asset.assetType.contentType });
      this.downloadFile(`${item.name}.${item.asset.dataFormat}`, blob);
    }
    /**
     * Function for dynamic menu 'locationsMenu'
     * @returns An array of the available locations in the game
     */
    locationsMenuItems() {
      let locations = [
        {
          text: "Basement",
          value: "basement2"
        },
        {
          text: "Outside",
          value: "oly"
        },
        {
          text: "Parallel Castle",
          value: "Parallel Castle"
        },
        {
          text: "Normal castle",
          value: "cly"
        },
        {
          text: "Floor 2",
          value: "Floor 2"
        },
        {
          text: "Ice Peaks",
          value: "ipl"
        },
        {
          text: "Ice Peaks B Side",
          value: "b side"
        },
        {
          text: "Deep Down Mine",
          value: "ddl"
        },
        {
          text: "Gray Abyss",
          value: "gal"
        },
        {
          text: "Calm Valley",
          value: "Calm Valley v1"
        },
        {
          text: "Rooftop",
          value: "Rooftop"
        },
        {
          text: "Fake Drop",
          value: "4ff"
        },
        {
          text: "Handsome Potato map",
          value: "2"
        },
        {
          text: "Chaos map",
          value: "disfraz1"
        },
        {
          text: "Obby",
          value: "ez obby"
        },
        {
          text: "Underground area",
          value: "underground area"
        },
        {
          text: "Underground area with exit",
          value: "underground area hint"
        },
        {
          text: "Underground area on fire",
          value: "underground areaGETOUTNOW"
        },
        {
          text: "Bells",
          value: "bell"
        },
        {
          text: "Color lake",
          value: "Color Lake 2"
        },
        {
          text: "Final Boss",
          value: "final fire"
        }

      ];
      return locations.concat(Array.from(mapIDs));
    }
    /**
     * Shows a game variable
     * @param {Object} args 
     * @param {BlockUtility} util 
     */
    showVar(args, util) {
      if (!iframeOld) { return };
      let varId = null;
      Object.keys(iframeOld.contentWindow.Scratch.vm.runtime.getTargetForStage().variables).forEach((key) => {
        let variable = iframeOld.contentWindow.Scratch.vm.runtime.getTargetForStage().variables[key]
        if (variable.name == args.VAR) {
          varId = variable.id;
        }

      })
      console.log(varId)
      iframeOld.contentWindow.Scratch.vm.runtime.monitorBlocks.changeBlock({
        id: varId,
        element: 'checkbox',
        value: true
      }, iframeOld.contentWindow.Scratch.vm.runtime);
    }
    /**
     * Hides a game variable
     * @param {Object} args 
     * @param {BlockUtility} util 
     */
    hideVar(args, util) {
      if (!iframeOld) { return };
      let varId = null;
      Object.keys(iframeOld.contentWindow.Scratch.vm.runtime.getTargetForStage().variables).forEach((key) => {
        let variable = iframeOld.contentWindow.Scratch.vm.runtime.getTargetForStage().variables[key]
        if (variable.name == args.VAR) {
          varId = variable.id;
        }

      })
      console.log(varId)
      iframeOld.contentWindow.Scratch.vm.runtime.monitorBlocks.changeBlock({
        id: varId,
        element: 'checkbox',
        value: false
      }, iframeOld.contentWindow.Scratch.vm.runtime);
    }
    /**
     * Sets a game variable to a value
     * @param {Object} args
     * @param {BlockUtility} util
     */
    setVar(args, util) {
      let varId = null;
      Object.keys(iframeOld.contentWindow.Scratch.vm.runtime.getTargetForStage().variables).forEach((key) => {
        let variable = iframeOld.contentWindow.Scratch.vm.runtime.getTargetForStage().variables[key]
        if (variable.name == args.VAR) {
          varId = variable.id;
        }

      })
      const variable = iframeOld.contentWindow.Scratch.vm.runtime.getTargetForStage().lookupOrCreateVariable(
        varId, args.VAR);
      variable.value = args.VALUE;
    }
    /**
     * Change a game variable by a value
     * @param {Object} args 
     * @param {BlockUtility} util 
     */
    changeVar(args, util) {
      let varId = null;
      Object.keys(iframeOld.contentWindow.Scratch.vm.runtime.getTargetForStage().variables).forEach((key) => {
        let variable = iframeOld.contentWindow.Scratch.vm.runtime.getTargetForStage().variables[key]
        if (variable.name == args.VAR) {
          varId = variable.id;
        }

      })
      const variable = iframeOld.contentWindow.Scratch.vm.runtime.getTargetForStage().lookupOrCreateVariable(
        varId, args.VAR);
      const castedValue = Scratch.Cast.toNumber(variable.value);
      const dValue = Scratch.Cast.toNumber(args.VALUE);
      const newValue = castedValue + dValue;
      variable.value = newValue;
    }
    /**
     * Returns if there's a game file loaded
     * @param {Object} args 
     * @param {BlockUtility} util 
     * @returns {boolean} If there's a game file loaded
     */
    isFileLoaded(args, util) {
      return this.file !== null;
    }
    /**
     * Returns a JSON representation of the sprite
     * @deprecated
     * @param {Object} args 
     * @param {BlockUtility} util 
     * @returns {string} JSON representation of the sprite
     */
    getSpriteJSON(args, util) {
      const target = util.target;
      return JSON.stringify(target);
    }
    /**
     * Closes the game IFrame
     */
    closeGame() {
      if (iframeOld) {
        Scratch.vm.renderer.removeOverlay(iframeOld);
        iframeOld = null;
      }
    }
    /**
     * Sends the start event to the compiler
     */
    StartGame(args, util) {
      util.startHats('typicmodloader_whenCompilerStarts');
    }
    /**
     * Compiler-only block that creates the IFrame
     * @param {Object} args 
     * @param {BlockUtility} util 
     */
    startGameDev(args, util) {
      if (!this.file) {
        console.error("No file loaded. Please load a file before starting the game.");
        return;
      }
      if (iframeOld) {
        Scratch.vm.renderer.removeOverlay(iframeOld);
      }
      mapIDs.clear();
      mapsSet.clear();
      teleportersSet.clear();
      dropsSet.clear();
      const iframe = document.createElement("iframe");
      iframeOld = iframe;
      iframe.src = URL.createObjectURL(this.file);
      iframe.tabIndex = 0;
      iframe.style.position = "fixed";
      iframe.style.top = "0";
      iframe.style.left = "0";
      iframe.style.width = "100%";
      iframe.style.height = "100%";
      iframe.style.border = "none";
      iframe.name = "game"
      console.log("Adding iframe overlay to Scratch VM renderer...");
      const overlay = Scratch.vm.renderer.addOverlay(iframe, "scale");
      overlay.container.style.zIndex = "0";
      iframe.contentWindow.extraInfo = "communication successful";

      const forwardKeyEvent = (type) => (event) => {
        if (!iframe.contentWindow || iframe.contentWindow.closed) {
          return;
        }

        const targetWindow = iframe.contentWindow;
        const targetDocument = targetWindow.document;
        if (!targetDocument) {
          return;
        }

        const forwardedEvent = new KeyboardEvent(type, {
          key: event.key,
          code: event.code,
          location: event.location,
          ctrlKey: event.ctrlKey,
          altKey: event.altKey,
          shiftKey: event.shiftKey,
          metaKey: event.metaKey,
          repeat: event.repeat,
          bubbles: true,
          cancelable: true,
        });

        Object.defineProperties(forwardedEvent, {
          which: { value: event.which ?? event.keyCode ?? 0 },
          keyCode: { value: event.keyCode ?? event.which ?? 0 },
          charCode: { value: event.charCode ?? 0 },
        });

        targetWindow.dispatchEvent(forwardedEvent);
        targetDocument.dispatchEvent(forwardedEvent);
        targetDocument.body?.dispatchEvent(forwardedEvent);
        targetDocument.documentElement?.dispatchEvent(forwardedEvent);
      };

      const forwardMouseEvent = (type) => (event) => {
        if (!iframe.contentWindow || iframe.contentWindow.closed) {
          return;
        }

        const targetWindow = iframe.contentWindow;
        const targetDocument = targetWindow.document;
        if (!targetDocument) {
          return;
        }

        const rect = iframe.getBoundingClientRect();
        const scaleX = rect.width / Math.max(iframe.offsetWidth, 1);
        const scaleY = rect.height / Math.max(iframe.offsetHeight, 1);
        const localX = (event.clientX - rect.left) / scaleX;
        const localY = (event.clientY - rect.top) / scaleY;
        const targetElement = targetDocument.elementFromPoint(localX, localY) || targetDocument.body || targetDocument.documentElement;
        if (!targetElement) {
          return;
        }

        let forwardedEvent;

        if (type === "wheel") {
          forwardedEvent = new WheelEvent(type, {
            deltaX: event.deltaX,
            deltaY: event.deltaY,
            deltaZ: event.deltaZ,
            deltaMode: event.deltaMode,
            clientX: localX,
            clientY: localY,
            screenX: event.screenX,
            screenY: event.screenY,
            ctrlKey: event.ctrlKey,
            altKey: event.altKey,
            shiftKey: event.shiftKey,
            metaKey: event.metaKey,
            bubbles: true,
            cancelable: true,
            view: targetWindow,
          });
        } else if (type.startsWith("pointer")) {
          forwardedEvent = new PointerEvent(type, {
            pointerId: event.pointerId,
            pointerType: event.pointerType,
            button: event.button,
            buttons: event.buttons,
            clientX: localX,
            clientY: localY,
            screenX: event.screenX,
            screenY: event.screenY,
            ctrlKey: event.ctrlKey,
            altKey: event.altKey,
            shiftKey: event.shiftKey,
            metaKey: event.metaKey,
            pressure: event.pressure,
            tangentialPressure: event.tangentialPressure,
            twist: event.twist,
            tiltX: event.tiltX,
            tiltY: event.tiltY,
            width: event.width,
            height: event.height,
            pointerType: event.pointerType,
            isPrimary: event.isPrimary,
            bubbles: true,
            cancelable: true,
            view: targetWindow,
          });
        } else {
          forwardedEvent = new MouseEvent(type, {
            button: event.button,
            buttons: event.buttons,
            clientX: localX,
            clientY: localY,
            screenX: event.screenX,
            screenY: event.screenY,
            ctrlKey: event.ctrlKey,
            altKey: event.altKey,
            shiftKey: event.shiftKey,
            metaKey: event.metaKey,
            bubbles: true,
            cancelable: true,
            view: targetWindow,
          });
        }

        Object.defineProperties(forwardedEvent, {
          which: { value: event.which ?? event.button ?? 0 },
          button: { value: event.button ?? 0 },
          buttons: { value: event.buttons ?? 0 },
        });

        targetWindow.dispatchEvent(forwardedEvent);
        targetElement.dispatchEvent(forwardedEvent);
        targetDocument.dispatchEvent(forwardedEvent);
      };

      window.addEventListener("keydown", forwardKeyEvent("keydown"), true);
      window.addEventListener("keyup", forwardKeyEvent("keyup"), true);
      window.addEventListener("mousemove", forwardMouseEvent("mousemove"), true);
      window.addEventListener("mousedown", forwardMouseEvent("mousedown"), true);
      window.addEventListener("mouseup", forwardMouseEvent("mouseup"), true);
      window.addEventListener("click", forwardMouseEvent("click"), true);
      window.addEventListener("dblclick", forwardMouseEvent("dblclick"), true);
      window.addEventListener("contextmenu", forwardMouseEvent("contextmenu"), true);
      window.addEventListener("wheel", forwardMouseEvent("wheel"), true);
      window.addEventListener("pointermove", forwardMouseEvent("pointermove"), true);
      window.addEventListener("pointerdown", forwardMouseEvent("pointerdown"), true);
      window.addEventListener("pointerup", forwardMouseEvent("pointerup"), true);
      window.addEventListener("pointercancel", forwardMouseEvent("pointercancel"), true);

      iframe.addEventListener("load", () => {
        try {
          iframe.contentWindow?.focus();
          const iframeDocument = iframe.contentWindow?.document;
          if (iframeDocument?.body) {
            iframeDocument.body.tabIndex = -1;
            iframeDocument.body.focus();
          }
        } catch (error) {
          console.warn("Could not focus the iframe game", error);
        }
      });

      overlay.container.addEventListener("click", () => {
        iframe.focus();
      });



    }
    /**
     * Compiler-only block to wait for Scratch to be ready in the IFrame
     * @param {Object} args 
     * @param {BlockUtility} util 
     */
    waitForIframe(args, util) {
      const iframe = iframeOld;
      if (iframe.contentWindow.Scratch == undefined) {
        util.yield();
      }
    }
    /**
     * Compiler-only block to wait for the stage to be ready in the IFrame
     * @param {Object} args 
     * @param {BlockUtility} util 
     */
    waitForIframe2(args, util) {
      //@type: HTMLIframeElement
      const iframe = iframeOld;
      if (iframe.contentWindow.Scratch.vm.runtime.getTargetForStage() == undefined) {
        util.yield();
      }
    }
    /**
     * Compiler-only block that sends the LoadMod event with the zip data
     * @param {Object} args 
     * @param {BlockUtility} util 
     */
    setupZip(args, util) {
      const iframe = iframeOld;

      console.log("Scratch VM is ready in the iframe.");
      const broadcast = "LoadMod";
      if (!broadcast) return;
      let JSONFile = {

      }

      JSONFile.maps = Array.from(mapsSet);
      JSONFile.teleporters = Array.from(teleportersSet);
      JSONFile.drops = Array.from(dropsSet);
      JSONFile.sprites = Array.from(customSpritesSet);
      zip.file(modid + "/" + modid + ".json", JSON.stringify(JSONFile));
      console.log("JSON: " + JSON.stringify(JSONFile));
      const data = this.getZipFile();
      let threads = iframe.contentWindow.Scratch.vm.runtime.startHats("event_whenbroadcastreceived", {
        BROADCAST_OPTION: broadcast,
      });
      threads.forEach((thread) => (thread.receivedData = data));

    }
    file = null;
    /**
     * Saves the HTML game file
     * @param {Blob} file 
     */
    readFile(file) {
      this.file = file;
    }
    /**
     * Stores the HTML game file
     */
    setupGame() {


      const input = document.createElement("input");
      input.type = "file";
      input.accept = "html";
      input.addEventListener("change", (e) => {
        const file = e.target.files[0];
        if (file) {
          this.readFile(file);
        }
      });

      input.click();
    }
    registerMaps(args, util) {
      util.startHats('typicmodloader_whenMapsRegistered');
    }
    registerDrops(args, util) {
      util.startHats('typicmodloader_whenDropsRegistered');
    }
    registerCustomSprites(args, util) {
      util.startHats('typicmodloader_whenCustomSpritesRegistered');
    }
  }





  Scratch.extensions.register(new TyPICModLoader());

})(Scratch);
