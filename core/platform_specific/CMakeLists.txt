cmake_minimum_required(VERSION 3.13)
project(MagicCap)
add_library(MagicCap tray_darwin.m hotkeys_darwin.m application_loop_darwin.m mainthread_darwin.m clipboard_darwin.m)

target_link_libraries(MagicCap "-framework Cocoa")
set_target_properties(MagicCap PROPERTIES LINK_FLAGS "-Wl,-F/Library/Frameworks")
