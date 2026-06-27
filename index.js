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
  disciplineCurrentPrompt: "Respond with a soft, encouraging reminder to stay focused, but remain kind and supportive."
};

const stoppedPomodoroType = "stopped"
const workPomodoroType = "work"
const breakPomodoroType = "break"

let runtimeSettings = defaultSettings
let remainingTime = runtimeSettings.workDuration;
let currentSessionCount = 0
let currentCycleType = stoppedPomodoroType
let timerInterval = null;
 
function onReadySetupUI() {
  $("#session_qty").val(runtimeSettings.sessionQty )
  $("#work_minutes").val(runtimeSettings.workDuration)
  $("#break_minutes").val(runtimeSettings.breakDuration)
  $("#start_work_prompt").val(runtimeSettings.workStartPrompt)
  $("#break_prompt").val(runtimeSettings.breakStartPrompt)
  $("#session_finished_prompt").val(runtimeSettings.breakStartPrompt)
  $("#discipline_toggle").prop("checked", runtimeSettings.disciplineMode).trigger("input");
  $("#discipline_level").val(runtimeSettings.disciplineLevel)
  $("#discipline_prompt").val(runtimeSettings.disciplineCurrentPrompt)
}

// Loads the extension settings if they exist, otherwise initializes them to the defaults.
async function loadSettings() {
  //Create the settings if they don't exist
  extension_settings[extensionName] = extension_settings[extensionName] || {};
  if (Object.keys(extension_settings[extensionName]).length === 0) {
    Object.assign(extension_settings[extensionName], defaultSettings);
  }
  runtimeSettings = extensionSettings[extensionName]
  onReadySetupUI()
}

function updateTimerDisplay() {
    let minutes = Math.floor(remainingTime / 60);
    let seconds = remainingTime % 60;
    // Update HTML label with jQuery
    $("#timer_label").text(
        `${minutes.toString().padStart(2, '0')}:${seconds.toString().padStart(2, '0')}`
    );
}

function intializeNewInterval(new_time_val) {
    remainingTime = new_time_val * 60
    timerInterval = setInterval(() => {
        if (remainingTime > 0) {
            remainingTime--;
            updateTimerDisplay();
        } else {
            clearInterval(timerInterval);
            timerInterval = null;
            checkPomodoroContinuity()
        }
    }, 1000);
}

function checkPomodoroContinuity() {
  clearInterval(timerInterval);
  timerInterval = null;
  if (currentSessionCount < runtimeSettings.sessionQty) {
    if (currentCycleType == workPomodoroType || currentCycleType == stoppedPomodoroType) {
      startPomodoroBreak()
    }
    else if (currentCycleType == breakPomodoroType) {
      currentSessionCount += 1
      if (currentSessionCount < runtimeSettings.sessionQty) {
        startPomodoroWork()
      }
    }
    else {
      onStopTimer()
    }
  }
  else {
    toastr.info(
      "[Information]",
      "Pomodoro Finished!"
    );
    onStopTimer()
  }
}

function startPomodoroWork() {
  if (timerInterval) return
  toastr.info(
    "[Information]",
    "Start Pomodoro, stay focused!"
  );
  intializeNewInterval(runtimeSettings.workDuration)
  currentCycleType = workPomodoroType
  generateTextWithPrompt(runtimeSettings.workStartPrompt)
}

function startPomodoroBreak() {
  toastr.info(
    "[Information]",
    "Break time, stretch and hydrate!"
  );
  intializeNewInterval(runtimeSettings.breakDuration)
  currentCycleType = breakPomodoroType
  generateTextWithPrompt(runtimeSettings.breakStartPrompt)
}

function onStopTimer() {
    clearInterval(timerInterval);
    timerInterval = null;
    remainingTime = runtimeSettings.workDuration; // Reset to full duration
    currentSessionCount = 0
    currentCycleType = stoppedPomodoroType
    updateTimerDisplay();
}

function onSaveSettings() {
  runtimeSettings.sessionQty = $("#session_qty").val()
  runtimeSettings.workDuration = $("#work_minutes").val()
  runtimeSettings.breakDuration = $("#break_minutes").val()
  runtimeSettings.workStartPrompt = $("#start_work_prompt").val()
  runtimeSettings.breakStartPrompt = $("#break_prompt").val()
  runtimeSettings.disciplineMode = $("#discipline_toggle").prop("checked");
  runtimeSettings.disciplineLevel = $("#discipline_level").val()
  runtimeSettings.disciplineCurrentPrompt = $("#discipline_prompt").val()
  extensionSettings[extensionName] = runtimeSettings
  saveSettingsDebounced()
  toastr.info(
    "[Information]",
    "Settings saved!!"
  );
}

function onResetSettingsToDefault() {
  extensionSettings[extensionName] = defaultSettings
  runtimeSettings = defaultSettings
  onReadySetupUI()
  saveSettingsDebounced()
  toastr.info(
    "[Information]",
    "Settings Reset!"
  );
}

function onDisciplineLevelChanged(val) {
  switch (val) {
    case "gentle":
      $("#discipline_prompt").val(defaultSettings.disciplineGentlePrompt)
      runtimeSettings.disciplineCurrentPrompt = defaultSettings.disciplineGentlePrompt
      break;
    case "firm":
      $("#discipline_prompt").val(defaultSettings.disciplineFirmPrompt)
      runtimeSettings.disciplineCurrentPrompt = defaultSettings.disciplineFirmPrompt
      break;
    case "strict":
      $("#discipline_prompt").val(defaultSettings.disciplineStrictPrompt)
      runtimeSettings.disciplineCurrentPrompt = defaultSettings.disciplineStrictPrompt
      break;
  }
}

async function generateTextWithPrompt(prompt_string) {
  const response = await generateQuietPrompt(prompt_string);
  sendMessageAs(getContext().name2, response);
}

globalThis.disciplinePromptInjector = async function(chat, contextSize, abort, type) {
    if (currentCycleType == stoppedPomodoroType || timerInterval === null || runtimeSettings.disciplineMode === false) return

    let pomodoro_injection = `[Discipline Mode] The user is in a Pomodoro work session.\n - If their message is casual, unrelated to the current task, or small talk: ${runtimeSettings.disciplineCurrentPrompt}\n - If their message is directly related to their work or task: respond normally and provide assistance, but keep replies concise and task‑focused.`
    
    if (currentCycleType == breakPomodoroType) {
      pomodoro_injection = `The user is currently in a break defined by the Pomodoro Timer (${runtimeSettings.breakDuration} minutes)`
    }
    
    const injection = {
        is_user: false,
        name: "System Note",
        send_date: Date.now(),
        mes: pomodoro_injection
    };

    // Insert before the last user message
    chat.splice(chat.length - 1, 0, injection);
}

// This function is called when the extension is loaded
jQuery(async () => {
  // This is an example of loading HTML from a file
  const settingsHtml = await $.get(`${extensionFolderPath}/example.html`);

  // Append settingsHtml to extensions_settings
  // extension_settings and extensions_settings2 are the left and right columns of the settings menu
  // Left should be extensions that deal with system functions and right should be visual/UI related 
  $("#extensions_settings").append(settingsHtml);

  $("#start_pomodoro").on("click", startPomodoroWork);
  $("#stop_pomodoro").on("click", onStopTimer);
  $("#discipline_level").on("change", function() {
    let selectedValue = $(this).val();
    onDisciplineLevelChanged(selectedValue);
  });
  $("#save_settings").on("click", onSaveSettings)
  $("#reset_settings").on("click", onResetSettingsToDefault)
  // Load settings when starting things up (if you have any)
  loadSettings();
});
