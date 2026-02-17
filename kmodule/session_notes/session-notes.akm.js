AKM.module({
    name: "session_notes",
    version: "1.0.0",
    description: "Quick shell note-taking commands. Demo for akmcc",
    author: "axrxvm",
    license: "MIT"
});

function cmdNoteSave(args) {
    const noteText = AKM.getArgs();
    const ticks = AKM.getTicks();
    const ticksStr = AKM.itoa(ticks);

    AKM.setenv("NOTE_TEXT", noteText);
    AKM.setenv("NOTE_TICKS", ticksStr);
    AKM.free(ticksStr);

    AKM.info("session_notes: note saved");
    return 0;
}

function cmdNoteShow(args) {
    const noteText = AKM.getenv("NOTE_TEXT");
    const noteTicks = AKM.getenv("NOTE_TICKS");

    AKM.print("session_notes: last note");
    AKM.print(noteText);
    AKM.print("session_notes: saved at ticks");
    AKM.print(noteTicks);

    return 0;
}

function cmdNoteClear(args) {
    AKM.setenv("NOTE_TEXT", "(empty)");
    AKM.setenv("NOTE_TICKS", "0");
    AKM.info("session_notes: note cleared");
    return 0;
}

AKM.command({
    name: "note-save",
    syntax: "note-save <text>",
    description: "Save a quick note for this session",
    category: "Productivity"
}, cmdNoteSave);

AKM.command({
    name: "note-show",
    syntax: "note-show",
    description: "Show the last saved note",
    category: "Productivity"
}, cmdNoteShow);

AKM.command({
    name: "note-clear",
    syntax: "note-clear",
    description: "Clear the saved note",
    category: "Productivity"
}, cmdNoteClear);

function init(ctx) {
    AKM.setenv("NOTE_TEXT", "(empty)");
    AKM.setenv("NOTE_TICKS", "0");
    AKM.info("session_notes: module loaded");
    return 0;
}

function exit(ctx) {
    AKM.info("session_notes: module unloaded");
}

export { init, exit };
