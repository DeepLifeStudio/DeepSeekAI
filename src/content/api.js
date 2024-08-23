import { md } from "./markdown";
import { getAllowAutoScroll } from "./scrollControl";
export async function getAIResponse(
  text,
  responseElement,
  signal,
  ps,
  iconContainer,
  aiResponseContainer
) {
  responseElement.innerHTML = "";
  let allowAutoScroll = true;
  iconContainer.style.display = "none";
  iconContainer.dataset.ready = "false";
  const { apiKey } = await new Promise((resolve) => {
    chrome.runtime.sendMessage({ action: "getApiKey" }, resolve);
  });

  if (!apiKey) {
    responseElement.innerHTML =
      "Please set your API key in the extension popup.";
    return;
  }

  try {
    const response = await fetch("https://api.deepseek.com/chat/completions", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${apiKey}`,
      },
      body: JSON.stringify({
        model: "deepseek-chat",
        messages: [
          {
            role: "system",
            content:
              "你是一个有帮助的AI助手,不管用户的语言选择，你都必须以中文提供文本回答",
          },
          { role: "user", content: text },
        ],
        stream: true,
      }),
      signal: signal,
    });

    if (!response.ok) {
      handleError(response.status, responseElement);
      return;
    }

    const reader = response.body.getReader();
    const decoder = new TextDecoder("utf-8");
    let aiResponse = "";

    while (true) {
      const { done, value } = await reader.read();
      if (done) break;

      const chunk = decoder.decode(value, { stream: true });
      const lines = chunk.split("\n\n");

      for (const line of lines) {
        if (line.startsWith("data: ")) {
          const jsonLine = line.slice(6);
          if (jsonLine === "[DONE]") break;

          try {
            const data = JSON.parse(jsonLine);
            if (
              data.choices &&
              data.choices[0].delta &&
              data.choices[0].delta.content
            ) {
              aiResponse += data.choices[0].delta.content;
              responseElement.innerHTML = md.render(aiResponse);
              ps.update();
              if (getAllowAutoScroll()) {
                aiResponseContainer.scrollTop =
                  aiResponseContainer.scrollHeight;
              }
            }
          } catch (e) {
            console.error("Error parsing JSON:", e);
          }
        }
      }
    }
    responseElement.appendChild(iconContainer);
    iconContainer.dataset.ready = "true";
  } catch (error) {
    console.error("Fetch error:", error);
    responseElement.innerHTML = "请求失败，请稍后重试。";
  }
}

function handleError(status, responseElement) {
  const errorMessages = {
    400: "请求体格式错误，请检查并修改。",
    401: "API key 错误，认证失败。",
    402: "账号余额不足，请充值。",
    422: "请求体参数错误，请检查并修改。",
    429: "请求速率达到上限，请稍后重试。",
    500: "服务器内部故障，请稍后重试。",
    503: "服务器负载过高，请稍后重试。",
  };
  responseElement.innerHTML = errorMessages[status] || "请求失败，请稍后重试。";
}
