/** At-rules that load other resources or name things for the whole page. */
const droppedAtRules = new Set(["import", "font-face", "namespace", "charset"]);

/** Functions that load a resource from a URL, or from a string read as a URL. */
const resourceFunctions = new Set([
  "url",
  "src",
  "image",
  "image-set",
  "-webkit-image-set",
  "cross-fade",
  "-webkit-cross-fade",
  "element",
  "-moz-element",
]);

/** Matches `url(...)` holding a data URL for an image, written without characters that could end the function or a block. */
const plainImageDataUrl =
  /^\(\s*["']?data:image\/[\w.+-]+(;[\w=.+-]+)*,[\w+/=%.~:;,!*$&@?#-]*["']?\s*\)$/i;

/**
 * Turns a dictionary's stylesheet into one that styles only the element that contains its `style` element.
 * Rules and values that would load other files are removed, so that a dictionary cannot make the app fetch remote resources.
 */
export function scopeDictionaryStylesheet(css: string): string {
  return `@scope {\n${new StylesheetSanitizer(css).run()}\n}`;
}

/**
 * Copies a stylesheet token by token, dropping what loads other resources.
 * It keeps its own count of open blocks, so that a stray closing brace cannot end the enclosing scope.
 */
class StylesheetSanitizer {
  private index = 0;
  private depth = 0;
  private output = "";
  private readonly css: string;

  constructor(css: string) {
    this.css = css;
  }

  run(): string {
    while (this.index < this.css.length) this.step();
    return this.output + "}".repeat(this.depth);
  }

  private step(): void {
    const char = this.css[this.index] as string;
    if (this.css.startsWith("/*", this.index)) this.skipComment();
    else if (char === '"' || char === "'") this.output += this.readString();
    else if (char === "{") this.openBlock();
    else if (char === "}") this.closeBlock();
    else if (char === "@") this.copyAtRule();
    else if (isNameChar(this.css, this.index)) this.copyName();
    else this.copyChar();
  }

  private copyChar(): void {
    this.output += this.css[this.index++];
  }

  private openBlock(): void {
    this.depth++;
    this.copyChar();
  }

  private closeBlock(): void {
    if (this.depth > 0) {
      this.depth--;
      this.output += "}";
    }
    this.index++;
  }

  private skipComment(): void {
    const end = this.css.indexOf("*/", this.index + 2);
    this.index = end === -1 ? this.css.length : end + 2;
  }

  /** Reads a string token. Like a browser, it ends the string at an unescaped line break. */
  private readString(): string {
    const quote = this.css[this.index++] as string;
    let text = quote;
    while (this.index < this.css.length) {
      const char = this.css[this.index] as string;
      if (char === "\n") return text;
      if (char === "\\") {
        text += this.css.slice(this.index, this.index + 2);
        this.index += 2;
        continue;
      }
      this.index++;
      if (char === quote) return text + quote;
      text += char;
    }
    return text + quote;
  }

  private copyName(): void {
    const { raw, name } = this.readName();
    if (this.css[this.index] === "(" && resourceFunctions.has(name))
      this.output += this.readResourceFunction(raw, name);
    else this.output += raw;
  }

  private copyAtRule(): void {
    this.index++;
    const { raw, name } = this.readName();
    if (droppedAtRules.has(name)) this.skipAtRule();
    else this.output += `@${raw}`;
  }

  private readResourceFunction(raw: string, name: string): string {
    const start = this.index;
    this.skipParenthesized();
    const argument = this.css.slice(start, this.index);
    return name === "url" && plainImageDataUrl.test(argument)
      ? raw + argument
      : "none";
  }

  /** Reads an identifier, decoding its escapes into the lowercase name that a browser matches on. */
  private readName(): { raw: string; name: string } {
    const start = this.index;
    let name = "";
    while (isNameChar(this.css, this.index)) {
      const escapeMatch = /^\\([0-9a-f]{1,6}\s?|[^\n])/i.exec(
        this.css.slice(this.index, this.index + 8),
      );
      name += escapeMatch
        ? decodeEscape(escapeMatch[1] as string)
        : this.css[this.index];
      this.index += escapeMatch ? escapeMatch[0].length : 1;
    }
    return { raw: this.css.slice(start, this.index), name: name.toLowerCase() };
  }

  private skipParenthesized(): void {
    let depth = 0;
    while (this.index < this.css.length) {
      const char = this.css[this.index] as string;
      if (char === '"' || char === "'") this.readString();
      else if (char === "\\") this.index += 2;
      else {
        this.index++;
        if (char === "(") depth++;
        if (char === ")" && --depth === 0) return;
      }
    }
  }

  /** Skips a statement at-rule up to its semicolon, or a block at-rule up to its closing brace. */
  private skipAtRule(): void {
    let depth = 0;
    while (this.index < this.css.length) {
      const char = this.css[this.index] as string;
      if (this.css.startsWith("/*", this.index)) this.skipComment();
      else if (char === '"' || char === "'") this.readString();
      else if (char === "\\") this.index += 2;
      else if (char === "}" && depth === 0) return;
      else {
        this.index++;
        if (char === ";" && depth === 0) return;
        if (char === "{") depth++;
        if (char === "}" && --depth === 0) return;
      }
    }
  }
}

function isNameChar(css: string, index: number): boolean {
  const char = css[index];
  if (char === undefined) return false;
  if (char === "\\")
    return css[index + 1] !== undefined && css[index + 1] !== "\n";
  return /[\w-]/.test(char) || char.charCodeAt(0) > 0x7f;
}

function decodeEscape(escaped: string): string {
  const hex = escaped.trim();
  if (!/^[0-9a-f]+$/i.test(hex)) return escaped;
  return String.fromCodePoint(Math.min(Number.parseInt(hex, 16), 0x10ffff));
}
