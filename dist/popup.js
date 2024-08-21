document.addEventListener("DOMContentLoaded", function () {
  const apiKeyInput = document.getElementById("apiKey");
  const saveButton = document.getElementById("saveButton");
  const errorMessage = document.getElementById("errorMessage");
  const toggleButton = document.getElementById("toggleVisibility");
  const iconSwitch = document.getElementById("iconSwitch");
  // 加载已保存的API密钥
  chrome.storage.sync.get("apiKey", function (data) {
    if (data.apiKey) {
      apiKeyInput.value = data.apiKey;
    }
  });
  toggleButton.addEventListener("click", function () {
    if (apiKeyInput.type === "password") {
      apiKeyInput.type = "text";
      iconSwitch.src = "icons/hiddle.svg";
    } else {
      apiKeyInput.type = "password";
      iconSwitch.src = "icons/show.svg";
    }
  });
  function validateApiKey(apiKey, callback) {
    fetch("https://api.deepseek.com/chat/completions", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${apiKey}`,
      },
      body: JSON.stringify({
        model: "deepseek-chat",
        messages: [
          { role: "system", content: "You are a helpful assistant." },
          { role: "user", content: "Hello!" },
        ],
        stream: false,
      }),
    })
      .then((response) => {
        if (response.status === 401) {
          callback(false);
        } else {
          callback(true);
        }
      })
      .catch(() => {
        callback(false);
      });
  }

  // 保存API密钥
  saveButton.addEventListener("click", function () {
    const apiKey = apiKeyInput.value.trim();

    if (apiKey === "") {
      errorMessage.textContent = "api-key不能为空!";
      return;
    }

    validateApiKey(apiKey, function (isValid) {
      if (isValid) {
        chrome.storage.sync.set({ apiKey: apiKey }, function () {
          errorMessage.textContent = "api-key已保存!";
          setTimeout(function () {
            errorMessage.textContent = "";
          }, 2000);
        });
      } else {
        errorMessage.textContent = "api-key无效!";
      }
    });
  });
});
