import { Modal, Notice, setIcon } from "obsidian";
import { BMOSettings, checkActiveFile } from "src/main";
import { ANTHROPIC_MODELS, OPENAI_MODELS, activeEditor, filenameMessageHistoryJSON, lastCursorPosition, lastCursorPositionFile, messageHistory } from "src/view";
import { fetchOpenAIAPI, fetchOpenAIBaseAPI, ollamaFetchData, ollamaFetchDataStream, requestUrlAnthropicAPI, openAIRestAPIFetchData } from "../FetchModel";

export function regenerateUserButton(settings: BMOSettings, referenceCurrentNote: string) {
    const regenerateButton = document.createElement("button");
    regenerateButton.textContent = "regenerate";
    setIcon(regenerateButton, "refresh-ccw");
    regenerateButton.classList.add("regenerate-button");
    regenerateButton.title = "regenerate";

    regenerateButton.addEventListener("click", async function () {
        const messageContainerEl = document.querySelector('#messageContainer');
        if (messageContainerEl) {
            const botMessages = messageContainerEl.querySelectorAll(".botMessage");
            const lastBotMessage = botMessages[botMessages.length - 1];
            const messageBlock = lastBotMessage.querySelector('.messageBlock');
            const lastBotMessageToolBarDiv = lastBotMessage.querySelector(".botMessageToolBar");
            if (lastBotMessageToolBarDiv) {
                const buttonContainerDiv = lastBotMessageToolBarDiv.querySelector(".button-container");
                if (buttonContainerDiv) {
                    // Remove the button container div
                    buttonContainerDiv.remove();
                }
            }
            if (messageBlock) {
                messageBlock.innerHTML = '';
                messageHistory.pop();

                const loadingEl = document.createElement("span");
                loadingEl.setAttribute("id", "loading"); 
                loadingEl.style.display = "inline-block"; 
                loadingEl.textContent = "..."; 

                // Define a function to update the loading animation
                const updateLoadingAnimation = () => {
                    const loadingEl = document.querySelector('#loading');
                    if (!loadingEl) {
                        return;
                    }
                    loadingEl.textContent += ".";
                    // If the loading animation has reached three dots, reset it to one dot
                    if (loadingEl.textContent?.length && loadingEl.textContent.length > 3) {
                        loadingEl.textContent = ".";
                    }
                };  

                // Dispaly loading animation
                lastBotMessage.appendChild(loadingEl);
                loadingEl.scrollIntoView({ behavior: 'smooth', block: 'end' });

                const loadingAnimationIntervalId = setInterval(updateLoadingAnimation, 500);
                lastBotMessage.scrollIntoView({ behavior: "smooth", block: "end" });

                // Fetch OpenAI API
                if (OPENAI_MODELS.includes(settings.model)) {
                    try {
                        await fetchOpenAIAPI(settings, referenceCurrentNote); 
                    }
                    catch (error) {
                        new Notice('Error occurred while fetching completion: ' + error.message);
                        console.log(error.message);
                    }
                }
                else if (settings.openAIBaseModels.includes(settings.model)) {
                    try {
                        await fetchOpenAIBaseAPI(settings, referenceCurrentNote); 
                    }
                    catch (error) {
                        new Notice('Error occurred while fetching completion: ' + error.message);
                        console.log(error.message);
                    }
                }
                else if (ANTHROPIC_MODELS.includes(settings.model)) {
                    try {
                        await requestUrlAnthropicAPI(settings, referenceCurrentNote);
                    }
                    catch (error) {
                        console.error('Error:', error);
                    }
                }
                else if (settings.ollamaRestAPIUrl && settings.ollamaModels.includes(settings.model)) {
                    if (settings.allowOllamaStream) {
                        await ollamaFetchDataStream(settings, referenceCurrentNote);
                    }
                    else {
                        await ollamaFetchData(settings, referenceCurrentNote);
                    }
                }
                else if (settings.openAIRestAPIUrl && settings.openAIRestAPIModels.includes(settings.model)){
                    await openAIRestAPIFetchData(settings, referenceCurrentNote);
                }
                else {
                    new Notice("No models detected.");
                }

                clearInterval(loadingAnimationIntervalId);
            }
        }
    });
    return regenerateButton;
}

export function displayUserCopyButton (userP: HTMLParagraphElement) {
    const copyButton = document.createElement("button");
    copyButton.textContent = "copy";
    setIcon(copyButton, "copy");
    copyButton.classList.add("copy-button");
    copyButton.title = "copy";

    copyButton.addEventListener("click", function () {
        const messageText = userP.textContent;

        if (messageText !== null) {
            copyMessageToClipboard(messageText);
            new Notice('Copied user message.');
        } else {
            console.error('Message content is null. Cannot copy.');
        }
    });
    return copyButton;
}

export function displayBotCopyButton (messageObj: {role: string; content: string;}, settings: BMOSettings) {
    const copyButton = document.createElement("button");
    copyButton.textContent = "copy";
    setIcon(copyButton, "copy");
    copyButton.classList.add("copy-button");
    copyButton.title = "copy";

    let messageText = messageObj.content;

    if (messageText !== null) {
        if (ANTHROPIC_MODELS.includes(settings.model)) {
            const fullString = messageObj.content;
            const cleanString = fullString.split(' ').slice(1).join(' ').trim();
            messageText = cleanString;
        } 
    } else {
        new Notice('Message content is null. Cannot copy.');
        console.error('Message content is null. Cannot copy.');
    }

    copyButton.addEventListener("click", function () {
        if (messageText !== null) {
            copyMessageToClipboard(messageText);
            new Notice('Copied bot message.');
        } else {
            console.error('Message content is null. Cannot copy.');
        }
    });
    return copyButton;
}

// Copy button for code blocks
export function codeBlockCopyButton(messageBlock: { querySelectorAll: (arg0: string) =>  NodeListOf<HTMLElement>; }) {
    const codeBlocks = messageBlock.querySelectorAll('.messageBlock pre code');
    codeBlocks.forEach((codeElement: HTMLElement) => {
        const copyButton = document.createElement("button");
        copyButton.textContent = "copy";
        setIcon(copyButton, "copy");
        copyButton.classList.add("copy-button");
        copyButton.title = "copy";
        if (codeElement.parentNode) {
            codeElement.parentNode.insertBefore(copyButton, codeElement.nextSibling);
        }
        copyButton.addEventListener("click", () => {
            // Extract the language from the class attribute
            const language = codeElement.getAttribute('class')?.replace('language-', '') || '';
            // Format the code text in markdown code block syntax
            const codeText = `\`\`\`${language}\n${codeElement.textContent}\`\`\``;
            if (codeText) {
                navigator.clipboard.writeText(codeText).then(() => {
                    new Notice('Copied codeblock.');
                }, (err) => {
                    console.error("Failed to copy code: ", err);
                    new Notice("Failed to copy code: ", err);
                });
            }
        });
    });
}

export function copyMessageToClipboard(message: string) {
    navigator.clipboard.writeText(message).then(function() {
    }).catch(function(err) {
      console.error('Unable to copy message: ', err);
    });
}

// Append button to editor
export function displayAppendButton(messageObj: {role: string; content: string;}) {
    const appendButton = document.createElement("button");
    appendButton.textContent = "append";
    setIcon(appendButton, "plus-square");
    appendButton.classList.add("append-button");
    appendButton.title = "append";

    const messageText = messageObj.content;

    appendButton.addEventListener("click", async function (event) {
        if (checkActiveFile?.extension === 'md') {
            // Check if the active file is different from the file of the last cursor position
            if ((checkActiveFile !== lastCursorPositionFile)) {
                // Append to the bottom of the file
                const existingContent = await app.vault.read(checkActiveFile);
                const updatedContent = existingContent + '\n' + messageText;
                app.vault.modify(checkActiveFile, updatedContent);
            } else {
                // Append at the last cursor position
                activeEditor?.replaceRange(messageText, lastCursorPosition);
            }

            event.stopPropagation();
            new Notice("Appended response.");
        }
        else {
            new Notice("No active Markdown file detected.");
        }
    });

    return appendButton;
}

export function displayTrashButton () {
    const trashButton = document.createElement("button");
    trashButton.textContent = "trash";
    setIcon(trashButton, "trash");
    trashButton.classList.add("trash-button");
    trashButton.title = "trash";

    let lastClickedElement: HTMLElement | null = null;

    trashButton.addEventListener("click", function (event) {
        event.stopPropagation();
        lastClickedElement = event.target as HTMLElement;

        while (lastClickedElement && !lastClickedElement.classList.contains('userMessage')) {
            lastClickedElement = lastClickedElement.parentElement;
        }

        if (lastClickedElement) {
            const userMessages = Array.from(document.querySelectorAll('#messageContainer .userMessage'));
        
            const index = userMessages.indexOf(lastClickedElement) * 2;
        
            if (index !== -1) {
                const modal = new Modal(app);
                
                modal.contentEl.innerHTML = `
                <div class="modal-content">
                    <h2>Delete Message Block.</h2>
                    <p>Are you sure you want to delete this message block?</p>
                    <button id="confirmDelete">Confirm Delete</button>
                </div>
                `;

                const confirmDeleteButton = modal.contentEl.querySelector("#confirmDelete");
                confirmDeleteButton?.addEventListener("click", async function () {
                    deleteMessage(index);
                    new Notice('Message deleted.');
                    // hideAllDropdowns();
                    modal.close();
                });

                modal.open();
        
            }
        }
    });
    return trashButton;
}

export async function deleteMessage(index: number) {
    const messageContainer = document.querySelector('#messageContainer');

    const divElements = messageContainer?.querySelectorAll('div.botMessage, div.userMessage');

    if (divElements && divElements.length > 0 && index >= 0 && index < divElements.length) {
        // Remove the specified message and the next one if it exists
        messageContainer?.removeChild(divElements[index]);
        // Check if the next message is from the assistant and remove it if it is
        if (index + 1 < divElements.length) {
            const nextMessage = divElements[index + 1];
            if (nextMessage.classList.contains('botMessage')) {
                messageContainer?.removeChild(nextMessage);
            }
        }
    }

    // Update the messageHistory by removing the specified index and potentially the next one
    if (messageHistory[index + 1] && messageHistory[index + 1].role === "assistant") {
        messageHistory.splice(index, 2);
    } else {
        messageHistory.splice(index, 1);
    }
    
    const jsonString = JSON.stringify(messageHistory, null, 4);

    try {
        await app.vault.adapter.write(filenameMessageHistoryJSON, jsonString);
    } catch (error) {
        console.error('Error writing messageHistory.json', error);
    }
}