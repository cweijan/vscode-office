
export const TimeStampVariableName = "$timestamp";
export const TimeStampVariableDescription = "Add a number of milliseconds between 1970/1/1 UTC Time and now. \
 You can also provide the offset with current time in the format {{$timestamp number string}}";
export const RandomIntVariableName = "$randomInt";
export const RandomIntDescription = "Returns a random integer between min (included) and max (excluded)";
export const ProcessEnvVariableName = "$processEnv";
export const ProcessEnvDescription = "Returns the value of process environment variable or '' if not found ";
export const DotenvVariableName = "$dotenv";
export const DotenvDescription = "Returns the environment value stored in a .env file";

export const CommentIdentifiersRegex: RegExp = /^\s*(#|\/{2})/;

export const FileVariableDefinitionRegex: RegExp = /^\s*@([^\s=]+)\s*=\s*(.*?)\s*$/;

export const RequestVariableDefinitionWithNameRegexFactory = (name: string, flags?: string): RegExp =>
    new RegExp(`^\\s*(?:#{1,}|\\/{2,})\\s+@name\\s+(${name})\\s*$`, flags);

export const RequestVariableDefinitionRegex: RegExp = RequestVariableDefinitionWithNameRegexFactory("\\w+", "m");

export const NoteCommentRegex = /^\s*(?:#{1,}|\/{2,})\s*@note\s*$/m;

export const LineSplitterRegex: RegExp = /\r?\n/g;