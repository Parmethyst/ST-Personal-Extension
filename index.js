// The main script for the extension
// The following are examples of some basic extension functionality

//You'll likely need to import extension_settings, getContext, and loadExtensionSettings from extensions.js
import { extension_settings, getContext, loadExtensionSettings } from "../../../extensions.js";
import { promptQuietForLoudResponse, sendMessageAs, sendNarratorMessage } from '../../../slash-commands.js';
//You'll likely need to import some other functions from the main script
import { saveSettingsDebounced } from "../../../../script.js";

const { generateQuietPrompt } = SillyTavern.getContext();

// Keep track of where your extension is located, name should match repo name
const extensionName = "ST-Personal-Extension";
const extensionFolderPath = `scripts/extensions/third-party/${extensionName}`;
const extensionSettings = extension_settings[extensionName];

const defaultSettings = {
  enabled: false,
  sessionQty: 4,
  workDuration: 25,
  breakDuration: 5,
  disciplineMode: false,
  disciplineLevel: "gentle",
  includePrompt: false,
  workStartPrompt: "The user is beginning a Pomodoro work session. Offer an encouraging, motivating message that sets a focused and positive tone.",
  breakStartPrompt: "The user has finished a Pomodoro work session and is starting a short break. Suggest relaxing or refreshing activities in a warm, supportive way.",
  pomodoroFinishedPrompt: "The user has completed all Pomodoro cycles. Celebrate their discipline and progress with a cheerful, rewarding message.",
  disciplineGentlePrompt: "Respond with a soft, encouraging reminder to stay focused, but remain kind and supportive.",
  disciplineFirmPrompt: "Respond with clear, motivational pushback. Remind the user strongly to stay on task, but keep tone constructive.",
  disciplineStrictPrompt: "Respond with strong enforcement, like a coach. Be direct and uncompromising, telling the user to stop chatting and return to work immediately.",
  disciplinePrompt: disciplineGentlePrompt
};

const secondsConversion = 60;

let timerDuration = 25 * secondsConversion; // 25 minutes in seconds
let breakTimer = 5 * secondsConversion;
let remainingTime = timerDuration;
let timerInterval = null;

 
// Loads the extension settings if they exist, otherwise initializes them to the defaults.
async function loadSettings() {
  //Create the settings if they don't exist
  extension_settings[extensionName] = extension_settings[extensionName] || {};
  if (Object.keys(extension_settings[extensionName]).length === 0) {
    Object.assign(extension_settings[extensionName], defaultSettings);
  }

  // Updating settings in the UI
  $("#example_setting").prop("checked", extension_settings[extensionName].example_setting).trigger("input");
}

function updateTimerDisplay() {
    let minutes = Math.floor(remainingTime / 60);
    let seconds = remainingTime % 60;
    // Update HTML label with jQuery
    $("#timer_label").text(
        `${minutes.toString().padStart(2, '0')}:${seconds.toString().padStart(2, '0')}`
    );
}

function onStartTimer() {
    if (timerInterval) return; // Prevent multiple intervals
    timerInterval = setInterval(() => {
        if (remainingTime > 0) {
            remainingTime--;
            updateTimerDisplay();
        } else {
            clearInterval(timerInterval);
            timerInterval = null;
            alert("Pomodoro finished!");
        }
    }, 1000);
}

function onStopTimer() {
    clearInterval(timerInterval);
    timerInterval = null;
    remainingTime = timerDuration; // Reset to full duration
    updateTimerDisplay();
}

// This function is called when the extension settings are changed in the UI
function onExampleInput(event) {
  const value = Boolean($(event.target).prop("checked"));
  extension_settings[extensionName].example_setting = value;
  saveSettingsDebounced();
}

// This function is called when the button is clicked
function onButtonClick() {
  // You can do whatever you want here
  // Let's make a popup appear with the checked setting
  toastr.info(
    `The checkbox is ${extension_settings[extensionName].example_setting ? "checked" : "not checked"}`,
    "A popup appeared because you clicked the button!"
  );
}
// // Start a break
// function startBreak() {
//   this.pomodoroActive = false;
//   this.injectPrompt("Break Time",
//     "The user has finished a Pomodoro work session and is starting a short break. Suggest relaxing or refreshing activities in a warm, supportive way.");
//   this.runTimer(this.settings.breakMinutes, () => {
//     if (this.currentCycle < this.settings.cycles) {
//       this.startPomodoro();
//     } else {
//       this.injectPrompt("Session Complete",
//         "The user has completed all Pomodoro cycles. Celebrate their discipline and progress with a cheerful, rewarding message.");
//     }
//   });
// }

// // Stop Pomodoro immediately
// function stopPomodoro() {
//   clearTimeout(this.timer);
//   this.pomodoroActive = false;
//   this.injectPrompt("Pomodoro Stopped",
//     "The user has stopped the Pomodoro session. Acknowledge this calmly and encourage them to resume later if possible.");
// }

// // Reset session progress
// function resetSession() {
//   clearTimeout(this.timer);
//   this.currentCycle = 0;
//   this.pomodoroActive = false;
//   this.injectPrompt("Session Reset",
//     "The Pomodoro session has been reset. Offer a supportive message to help the user restart fresh.");
// }

// // Timer runner
// function runTimer(minutes, callback) {
//   clearTimeout(this.timer);
//   this.timer = setTimeout(callback, minutes * 60 * 1000);
//   this.injectPrompt("Timer Set",
//     `A timer has been set for ${minutes} minutes. Acknowledge this in a concise, reassuring way.`);
// }

// // Discipline hook: intercept user messages during work sessions
// function onUserMessage(userText) {
//   if (this.settings.disciplineMode && this.pomodoroActive) {
//     let severityPrompt = "";
//     switch (this.settings.disciplineSeverity) {
//       case "gentle":
//         severityPrompt = "Respond with a soft, encouraging reminder to stay focused, but remain kind and supportive.";
//         break;
//       case "firm":
//         severityPrompt = "Respond with clear, motivational pushback. Remind the user strongly to stay on task, but keep tone constructive.";
//         break;
//       case "strict":
//         severityPrompt = "Respond with strong enforcement, like a coach. Be direct and uncompromising, telling the user to stop chatting and return to work immediately.";
//         break;
//     }

//     return `[Discipline Mode] The user is in a Pomodoro work session. 
//       - If their message is casual, unrelated to the current task, or small talk: ${severityPrompt}
//       - If their message is directly related to their work or task: respond normally and provide assistance, but keep replies concise and task‑focused.\n\nUser said: ${userText}`;
//   }
//   return userText;
// }

async function generateTextWithPrompt(prompt_string) {
  const response = await generateQuietPrompt(prompt_string);
  sendMessageAs(getContext().name2, response);
}

function onDebugFunction() {
  generateTextWithPrompt("Tell me a joke");
  toastr.info(
    "A popup appeared because you clicked the button!"
  );
}

//   // Helper to inject event prompts into chat
//   injectPrompt(eventType, eventDescription) {
//     window.addMessage({
//       role: "user",
//       content: `[System Event: ${eventType}] ${eventDescription}`
//     });
//   }
// };

// This function is called when the extension is loaded
jQuery(async () => {
  // This is an example of loading HTML from a file
  const settingsHtml = await $.get(`${extensionFolderPath}/example.html`);

  // Append settingsHtml to extensions_settings
  // extension_settings and extensions_settings2 are the left and right columns of the settings menu
  // Left should be extensions that deal with system functions and right should be visual/UI related 
  $("#extensions_settings").append(settingsHtml);

  // These are examples of listening for events
  $("#my_button").on("click", onButtonClick);
  $("#example_setting").on("input", onExampleInput);

  // $("#my_button").on("click", onButtonClick);
  // $("#example_setting").on("input", onExampleInput);
  $("#debug_button").on("click", onDebugFunction);
  $("#start_pomodoro").on("click", onStartTimer);
  $("#stop_pomodoro").on("click", onStopTimer);
  // Load settings when starting things up (if you have any)
  loadSettings();
});
