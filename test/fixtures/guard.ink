VAR passed = false
EXTERNAL giveItem(item)
-> start

=== start ===
Guard: Halt! Who goes there? # sfx:alarm
* [A friend.] -> friend
* [Nobody.] -> nobody

=== friend ===
Guard: Pass, friend.
~ passed = true
~ giveItem("badge")
-> END

=== nobody ===
Guard: Then be off!
-> END
