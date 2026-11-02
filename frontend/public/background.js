chrome.action.onClicked.addListener(async () => {
  try {
    await chrome.tabs.create({ url: "index.html?env=addon" });
  } catch (e) {
    console.error("탭 생성 에러:", e);
    try {
      await chrome.windows.create({ url: "index.html?env=addon", type: "popup" });
    } catch (fallbackErr) {
      console.error("Fallback 창 생성 에러:", fallbackErr);
    }
  }
});
