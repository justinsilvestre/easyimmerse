@echo off
rem Prints the media URL, subtitle URL, and title for the locator given as the
rem first argument. The fixture-media-source plugin asks the host to run this.
echo {"media_url":"%~1.mp4","subtitle_url":"%~1.srt","title":"Fixture"}
