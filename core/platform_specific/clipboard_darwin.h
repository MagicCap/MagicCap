#ifndef _CLIPBOARD_DARWIN_H
#define _CLIPBOARD_DARWIN_H
void ClipboardHandlerBytes(uint8_t* data, int64_t len, char* extension);
void ClipboardHandlerText(char* data);
struct ClipboardGet;
struct ClipboardGet* ClipboardHandlerGet();
#endif
