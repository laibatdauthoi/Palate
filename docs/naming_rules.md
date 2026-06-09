# Naming Rules

## Project Name

The project name is Palate.

Use Palate with uppercase P in all brand names, UI text, documentation titles, README content, prompts, and filenames that contain the project name.

Correct examples:

Palate

Palate_spec.md

Palate MVP

Palate frontend

Do not write the project name as palate in user-facing text.

The lowercase form palate is only allowed for technical identifiers where lowercase is standard, such as package names, module names, import paths, environment keys, or repository internals if required by tooling.

## File Names

File names should follow the same naming style as the project rules.

If the file name contains the project name, use Palate with uppercase P.

Examples:

Palate_spec.md

If the file name does not contain the project name, use lowercase words separated by underscores.

Examples:

read_me.md

naming_rules.md

Codex_rules.md

contract_plan.md

frontend_plan.md

Do not use random casing such as palateSpec.md, PalateSpec.md, or namingRules.md for documentation files.

## Class Or Struct Names

Class names and struct names must use common nouns or adjectives.

Words are separated by underscores.

Do not capitalize the first letter unless the word is an abbreviation.

Correct examples:

class_name

media_record

active_match

waiting_push

love_record

user_summary

protocol_config

category_rule

Incorrect examples:

ClassName

MediaRecord

ActiveMatch

waitingPush

ProtocolConfig

## Instance Names

Instance names must use proper nouns or proper adjectives.

Capitalize the first letter of each word.

Correct examples:

Instance1

InstanceOne

MediaOne

MatchOne

UserOne

ConfigOne

PushOne

Incorrect examples:

instance_one

media_one

matchOne

userOne

config_one

## Function Names

Function names must use verbs.

The first letter of the function name must be lowercase.

Use camelCase.

Correct examples:

doThis

getValue

registerMedia

createPush

challengePush

findMatch

skipMatch

placeLove

calculateLoveScore

settleMatch

claimPush

claimLove

updateProtocolConfig

Incorrect examples:

DoThis

get_value

register_media

CreatePush

challenge_push

settle_match

## General Rule

Use names that describe the actual role of the item.

Do not rename Palate.

Do not invent new naming styles unless the tooling forces a specific convention.

If a framework or language requires a different naming style, follow the framework only where necessary and document the exception.
