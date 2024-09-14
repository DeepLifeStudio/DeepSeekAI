document.addEventListener("DOMContentLoaded", function () {
  const apiKeyInput = document.getElementById("apiKey");
  const saveButton = document.getElementById("saveButton");
  const errorMessage = document.getElementById("errorMessage");
  const toggleButton = document.getElementById("toggleVisibility");
  const iconSwitch = document.getElementById("iconSwitch");
  const languageSelect = document.getElementById("language");

  // Load saved API key and language preference
  chrome.storage.sync.get(["apiKey", "language"], function (data) {
    if (data.apiKey) {
      apiKeyInput.value = data.apiKey;
    }
    if (data.language) {
      languageSelect.value = data.language;
    }
  });

  toggleButton.addEventListener("click", function () {
    if (apiKeyInput.type === "password") {
      apiKeyInput.type = "text";
      iconSwitch.src = "../icons/hiddle.svg";
    } else {
      apiKeyInput.type = "password";
      iconSwitch.src = "../icons/show.svg";
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

  // Save API key and language preference
  saveButton.addEventListener("click", function () {
    const apiKey = apiKeyInput.value.trim();
    const language = languageSelect.value;

    if (apiKey === "") {
      errorMessage.textContent = "api-key不能为空!";
      return;
    }

    validateApiKey(apiKey, function (isValid) {
      if (isValid) {
        chrome.storage.sync.set(
          { apiKey: apiKey, language: language },
          function () {
            errorMessage.textContent = "设置已保存!";
            setTimeout(function () {
              errorMessage.textContent = "";
            }, 2000);
          }
        );
      } else {
        errorMessage.textContent = "api-key无效!";
      }
    });
  });
});
