import { app, BrowserWindow, ipcMain } from 'electron';
import { exists, readFileSync, writeFileSync } from 'fs';
import request from 'request';

// Handle creating/removing shortcuts on Windows when installing/uninstalling.
if (require('electron-squirrel-startup')) { // eslint-disable-line global-require
  app.quit();
}

// Keep a global reference of the window object, if you don't, the window will
// be closed automatically when the JavaScript object is garbage collected.
let mainWindow;

const createWindow = () => {
    // Create the browser window.
  mainWindow = new BrowserWindow({
    width: 450,
    height: 600,
  });

    // and load the index.html of the app.
  mainWindow.loadURL(`file://${__dirname}/index.html`);

    // Open the DevTools.
    // mainWindow.webContents.openDevTools();

    // Emitted when the window is closed.
  mainWindow.on('closed', () => {
        // Dereference the window object, usually you would store windows
        // in an array if your app supports multi windows, this is the time
        // when you should delete the corresponding element.
    mainWindow = null;
  });
};

// This method will be called when Electron has finished
// initialization and is ready to create browser windows.
// Some APIs can only be used after this event occurs.
app.on('ready', createWindow);

// Quit when all windows are closed.
app.on('window-all-closed', () => {
    // On OS X it is common for applications and their menu bar
    // to stay active until the user quits explicitly with Cmd + Q
  if (process.platform !== 'darwin') {
    app.quit();
  }
});

app.on('activate', () => {
    // On OS X it's common to re-create a window in the app when the
    // dock icon is clicked and there are no other windows open.
  if (mainWindow === null) {
    createWindow();
  }
});

// In this file you can include the rest of your app's specific main process
// code. You can also put them in separate files and import them here.

function generateUserData() {
  return {
    username: "",
    password: "",
    TLE: {},
  };
}

const userDataFile = 'userdata.json';
let userDataCache;
let userDataExists;

function updateUserData(args) {
  exists(userDataFile, (isExists) => {
    if (isExists) {
      const rawdata = readFileSync(userDataFile);
      userDataCache = JSON.parse(rawdata);
      userDataCache.username = args.username;
      userDataCache.password = args.password;
      writeFileSync(userDataFile, JSON.stringify(userDataCache,null,2));
    }
    else {
      userDataCache = generateUserData();
      userDataExists = false;
      writeFileSync(userDataFile, JSON.stringify(args,null,2));
    }
  });
}

function updateCache() {
  exists(userDataFile, (isExists) => {
    if (isExists) {
      const rawdata = readFileSync(userDataFile);
      userDataCache = JSON.parse(rawdata);
      userDataExists = true;
    } else {
      userDataCache = generateUserData();
      userDataExists = false;
    }
  });
}

function updateTLE(Output) {
  exists(userDataFile, (isExists) => {
    if (isExists) {
      const rawdata = readFileSync(userDataFile);
      userDataCache = JSON.parse(rawdata);
    } else {
      userDataCache = generateUserData();
      userDataExists = false;
    }
    userDataCache.TLE = Output;
    writeFileSync(userDataFile, JSON.stringify(userDataCache,null,2));
  });
}

updateCache();

function determineItlid(itlid) {
  let year = itlid.substr(0,2);
  if (parseInt(year) >= 57) itlid = '19' + itlid;
  else itlid = '20' + itlid;
  return itlid;
}

function generateTLEJson(body) {
  let OutJSON = {
    data: [],
  };
  let arrStr = body.split(/\n/);
  let len = parseInt(arrStr.length / 3);
  for (let i=0; i<len-1; i++) {
    let ArrayTmp = {
      'id': parseInt(arrStr[3 * i+2].substr(2, 5)),
      'name': arrStr[3 * i].substr(2, arrStr[3 * i].length - 3),
      'itlid': determineItlid(arrStr[3 * i+1].substr(9, 2) + '-' + arrStr[3 * i + 1].substr(11,arrStr[3*i+1].indexOf(' ',9) - 11)),
      'Line0': arrStr[3 * i].substr(0, arrStr[3 * i].length - 1),
      'Line1': arrStr[3 * i + 1].substr(0, arrStr[3 * i + 1].length - 1),
      'Line2': arrStr[3 * i + 2].substr(0, arrStr[3 * i + 2].length - 1)
    };
    OutJSON.data.push(ArrayTmp);
  }
  OutJSON['getTime'] = new Date().getTime()
  return OutJSON;
}

function getTLEs(username, password) {
  let cookiezi = '';
  request({
    url: 'https://www.space-track.org/ajaxauth/login',
    method: 'POST',
    json: true,
    body: {
      identity: username,
      password: password
    }
  }, function(error, response, body) {
    if (!error && response.statusCode == 200) {
      if (body.Login === 'Failed') return mainWindow.webContents.send('MTOR',{
        head: 'alertMsg',
        body: {msg: '登录SpaceTrack失败，请检查用户名和密码'}
      });
      cookiezi = response.rawHeaders[5].split(';')[0];
      request({
        url: 'https://www.space-track.org/basicspacedata/query/class/tle_latest/ORDINAL/1/EPOCH/%3Enow-30/orderby/NORAD_CAT_ID/format/3le',
        method: 'GET',
        json: true,
        headers: {'Cookie': cookiezi}
      }, function(error, response, body) {
        if (!error && response.statusCode == 200) {
          mainWindow.webContents.send('MTOR',{
            head: 'alertMsg',
            body: {msg: '获取TLE成功'}
          })
          let Output = generateTLEJson(body);
          updateTLE(Output);
        }
        else mainWindow.webContents.send('MTOR',{
          head: 'alertMsg',
          body: {msg: '获取TLE失败'}
        })
      });
    }
  });
}

// arg structure: { head:xxx, body:{} }

ipcMain.on('RTOM', (event, arg) => {//监听渲染进程事件
  switch (arg.head) {
    case 'getTLE': {
      event.sender.send('MTOR', {
        head: 'TLE',
        body: {
          exists: userDataExists,
          data: userDataCache.TLE
        },
      });
      break;
    }
    case 'getUserData': {
      event.sender.send('MTOR', {
        head: 'userData',
        body: {
          exists: userDataExists,
          data: {
            username: userDataCache.username,
            password: userDataCache.password
          }
        },
      });
      break;
    }
    case 'updateUserData': {
      updateUserData(arg.body);
      updateCache();
      event.sender.send('MTOR', {
        head: 'userData',
        body: {
          exists: userDataExists,
          data: arg.body,
        },
      });
      break;
    }
    case 'applyLogin': {
      getTLEs(arg.body.username,arg.body.password);
      break;
    }
    case 'objectTrack': {
      const trackWindow = new BrowserWindow({
        width: 1280,
        height: 720,
        show: false
      })
      trackWindow.loadURL(`file://${__dirname}/track.html`);
      trackWindow.once('ready-to-show', () => {
        trackWindow.show()
      });
      trackWindow.on('show', () => {
        trackWindow.webContents.send('MTOR', arg);
      });
    }
    default: break;
  }
});
