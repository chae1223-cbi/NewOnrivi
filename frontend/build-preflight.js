const { execFileSync } = require('child_process');
require('./prepare-pagedjs.cjs');

// 두 빌더는 소스 라우트를 임시 이동하므로 개발 서버와 동시에 실행할 수 없다.
module.exports = function assertDevServerStopped() {
  try {
    execFileSync(process.execPath, ['-e', `
      const socket = require('net').connect({host:'127.0.0.1',port:3100});
      socket.setTimeout(1000);
      socket.on('connect',()=>{socket.destroy();process.exit(10);});
      socket.on('error',error=>{process.exit(error.code==='ECONNREFUSED'?0:11);});
      socket.on('timeout',()=>{socket.destroy();process.exit(11);});
    `], { stdio: 'pipe' });
  } catch (error) {
    console.error(error.status === 10
      ? '[build] localhost:3100 개발 서버가 실행 중입니다. 개발 서버 터미널에서 Ctrl+C로 종료한 뒤 빌드해 주세요. 소스 파일은 이동하지 않았습니다.'
      : '[build] 개발 서버 실행 여부를 확인하지 못했습니다. 포트 3100 상태를 확인한 뒤 다시 실행해 주세요.');
    process.exit(1);
  }
};
