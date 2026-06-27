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

function intializeNewInterval(new_time_val) {
    remainingTime = new_time_val * 60
    timerInterval = setInterval(() => {
        if (remainingTime > 0) {
            remainingTime--;
            updateTimerDisplay();
        } else {
            clearInterval(timerInterval);
            timerInterval = null;
            if (currentSessionCount < runtimeSettings.sessionQty) {
              if (currentCycleType == workPomodoroType) {
                startPomodoroBreak()
              }
              else if (currentCycleType == breakPomodoroType) {
                startPomodoroWork()
                currentSessionCount += 1
              }
              else if (currentCycleType == stoppedPomodoroType) {
                startPomodoroWork()
              }
              else {
                onStopTimer()
              }
            }
        }
    }, 1000);
}

function startPomodoroWork() {
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

// This function is called when the extension settings are changed in the UI
function onExampleInput(event) {
  const value = Boolean($(event.target).prop("checked"));
  extension_settings[extensionName].example_setting = value;
  saveSettingsDebounced();
}

function onSaveSettings() {
  runtimeSettings.workDuration = $("#work_minutes").val(runtimeSettings.workDuration)
  runtimeSettings.breakDuration = $("#break_minutes").val(runtimeSettings.breakDuration)
  runtimeSettings.workStartPrompt = $("#start_work_prompt").val(runtimeSettings.workStartPrompt)
  runtimeSettings.breakStartPrompt = $("#break_prompt").val(runtimeSettings.breakStartPrompt)
  runtimeSettings.disciplineMode = $("#discipline_toggle").prop("checked", runtimeSettings.disciplineMode).trigger("input");
  runtimeSettings.disciplineLevel = $("#discipline_level").val(runtimeSettings.disciplineLevel)
  runtimeSettings.disciplineCurrentPrompt = $("#discipline_prompt").val()
  extensionSettings[extensionName] = runtimeSettings
  saveSettingsDebounced()
}

function onResetSettingsToDefault() {
  extensionSettings[extensionName] = defaultSettings
  runtimeSettings = defaultSettings
  onReadySetupUI()
  saveSettingsDebounced()
}

function onDisciplineLevelChanged(val) {
  switch (val) {
    case "gentle":
      $("#discipline_prompt").val(disciplineGentlePrompt)
      break;
    case "firm":
      $("#discipline_prompt").val(disciplineFirmPrompt)
      break;
    case "strict":
      $("#discipline_prompt").val(disciplineStrictPrompt)
      break;
  }
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
  $("#discipline_level").on('change', function() {
    let selectedValue = $(this).val();
    onDisciplineLevelChanged(selectedValue);
  });
  $("#save_settings").on("click", onSaveSettings)
  $("#reset_settings").on("click", onResetSettingsToDefault)
  // Load settings when starting things up (if you have any)
  loadSettings();
});
