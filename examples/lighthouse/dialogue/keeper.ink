// The keeper's conversation. Compile with: node tools/compile-ink.mjs examples/lighthouse/dialogue/keeper.ink
VAR knowsLamp = false
EXTERNAL giveItem(item)
EXTERNAL setFlag(name)

-> start

=== start ===
{ knowsLamp: -> again }
Keeper: Eh? A visitor. Nobody comes to Gull Point any more. # sfx:bell
* [I am just looking around.] -> looking
* [Your lamp is out. I can fix it.] -> fix

=== looking ===
Keeper: Look all you like. Mind the stairs.
~ setFlag("keeperMet")
-> END

=== fix ===
Keeper: Fix it? Ha! It needs lamp oil and a flame, and I have neither.
Keeper: Take my matches, then. The oil can must still be lying on the dock somewhere.
~ knowsLamp = true
~ giveItem("matches")
~ setFlag("keeperMet")
-> END

=== again ===
Keeper: Still here? The lamp will not light itself, you know.
-> END
