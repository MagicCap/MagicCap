#!/usr/bin/python2.7

from __future__ import print_function
from os.path import expanduser
import sqlite3
import json

home = expanduser("~")

try:
    input = raw_input
except NameError:
    pass

print("MagicCap lite touch configuration tool. Copyright (C) Jake Gealer 2019.")

origin_config = {}

def print_no_new_line(to_print):
    print(to_print, end="")

print_no_new_line("Getting the current config...")

try:
    db = sqlite3.connect(home + "/magiccap.db")
    cursor = db.cursor()
    for row in cursor.execute("SELECT * FROM config"):
        origin_config[row[0]] = json.loads(row[1])
except Exception:
    print_no_new_line(" fail!\n")
    print("Is MagicCap installed and configured?")
    exit(1)

print_no_new_line(" done!\n")

lite_touch = {
    "$note": "To change this configuration, you should rerun the lite touch script.",
    "version": 1,
    "config_allowed": {},
    "config": origin_config
}

if lite_touch['config'].get("autoupdate_on") is None:
    lite_touch['config']['autoupdate_on'] = False

def yes_no_input(text):
    while True:
        tf_map = {
            "y": True,
            "n": False
        }
        try:
            return tf_map[input(text + " (y/n): ").lower()]
        except KeyError:
            print("Invalid option.")

if lite_touch['config']['autoupdate_on']:
    lite_touch['config']['autoupdate_on'] = yes_no_input(
        "We noticed you have autoupdate on. Do you want to keep it on since it will require administrator credentials to do updates?"
    )

lite_touch['config_allowed']['ClipboardAction'] = yes_no_input("Do you want to allow your users to change the clipboard action?")
lite_touch['config_allowed']['FileConfig'] = yes_no_input("Do you want to allow your users to change the file saving configuration?")
lite_touch['config_allowed']['HotkeyConfig'] = yes_no_input("Do you want to allow your users to change the hotkey configuration?")
lite_touch['config_allowed']['UploaderConfig'] = yes_no_input("Do you want to allow your users to change the uploader configuration?")
lite_touch['config_allowed']['BetaUpdates'] = yes_no_input("Do you want to allow your users to change the beta updates configuration?")
lite_touch['config_allowed']['ToggleTheme'] = yes_no_input("Do you want to allow your users to toggle the theme of the GUI?")

lite_touch['link_shortener_allowed'] = yes_no_input("Do you want to allow your users to use the built in link shortener?")

if lite_touch['config']['save_path'] and lite_touch['config']['save_path'].startswith(home):
    lite_touch['config']['save_path'] = lite_touch['config']['save_path'].replace(home, "$H", 1)

json.dump(lite_touch, open("./magiccap_deployment_info.json", "w+"), indent=4)

print('Saved the deployment configuration to a file named "./magiccap_deployment_info.json". Simply place this file at /usr/share/magiccap_deployment_info.json and give everyone read (but NOT write) permissions.')
