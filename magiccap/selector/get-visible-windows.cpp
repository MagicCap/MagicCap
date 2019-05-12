// This code is a part of MagicCap which is a MPL-2.0 licensed project.
// Copyright (C) Jake Gealer <jake@gealer.email> 2019.

#include <stdio.h>

#ifdef _WIN32
#include <Windows.h>
BOOL CALLBACK EnumWindowsProc(HWND hwnd, LPARAM _)
{
    if (IsWindowVisible(hwnd))
    {
        RECT WindowRect;
        GetWindowRect(hwnd, &WindowRect);
        printf("%i %i %i %i\n", (int)WindowRect.left, (int)WindowRect.top, (int)WindowRect.right - (int)WindowRect.left, (int)WindowRect.bottom - (int)WindowRect.top);
    }
    return true;
}

int main()
{
    EnumWindows(EnumWindowsProc, 0);
    return 0;
}
#elif __APPLE__
#include <ApplicationServices/ApplicationServices.h>
#include <string.h>
int main()
{
    CFArrayRef WindowList = CGWindowListCopyWindowInfo(kCGWindowListExcludeDesktopElements | kCGWindowListOptionOnScreenAboveWindow, kCGNullWindowID);
    int ArrLength = CFArrayGetCount(WindowList);
    for (int i = 0; i < ArrLength; ++i) {
        CFDictionaryRef ProcessRef = (CFDictionaryRef)CFArrayGetValueAtIndex(WindowList, i);

        const char *WindowName = CFStringGetCStringPtr((CFStringRef)CFDictionaryGetValue(ProcessRef, kCGWindowName), kCFStringEncodingUTF8);
        if (WindowName != NULL && strcmp(WindowName, "Dock") == 0) {
            continue;
        }

        CFBooleanRef WindowBool = reinterpret_cast<CFBooleanRef>(CFDictionaryGetValue(ProcessRef, kCGWindowIsOnscreen));

        if (WindowBool != NULL && CFBooleanGetValue(WindowBool) == true) {
            CGRect ItemBounds;
            CGRectMakeWithDictionaryRepresentation((CFDictionaryRef)CFDictionaryGetValue(ProcessRef, kCGWindowBounds), &ItemBounds);

            printf("%i %i %i %i\n", (int)ItemBounds.origin.x, (int)ItemBounds.origin.y, (int)ItemBounds.size.width, (int)ItemBounds.size.height);
        }
    }
    return 0;
}
#else
int main()
{
    return 0;
}
#endif
