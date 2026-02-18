export class MarkdownParser {
    private static escapeHtml(text: string): string {
        const div = document.createElement('div');
        div.textContent = text;
        return div.innerHTML;
    }

    private static parseInline(text: string): string {
        text = text.replace(/\*\*(.*?)\*\*/g, '<strong>$1</strong>');
        text = text.replace(/__(.*?)__/g, '<strong>$1</strong>');

        text = text.replace(/\*(.*?)\*/g, '<em>$1</em>');
        text = text.replace(/_(.*?)_/g, '<em>$1</em>');

        text = text.replace(/`([^`]+)`/g, '<code>$1</code>');

        text = text.replace(/\[([^\]]+)\]\(([^)]+)\)/g, '<a href="$2" target="_blank" rel="noopener noreferrer">$1</a>');

        return text;
    }

    static parse(markdown: string): string {
        if (!markdown) return '';

        const lines = markdown.split('\n');
        const html: string[] = [];
        let inCodeBlock = false;
        let codeBlockLines: string[] = [];
        let inList = false;
        let listItems: string[] = [];

        for (let i = 0; i < lines.length; i++) {
            const line = lines[i];
            const trimmedLine = line.trim();

            if (line.startsWith('```')) {
                if (inCodeBlock) {
                    html.push(`<pre><code>${this.escapeHtml(codeBlockLines.join('\n'))}</code></pre>`);
                    codeBlockLines = [];
                    inCodeBlock = false;
                } else {
                    if (inList) {
                        html.push(`<ul>${listItems.join('')}</ul>`);
                        listItems = [];
                        inList = false;
                    }
                    inCodeBlock = true;
                }
                continue;
            }

            if (inCodeBlock) {
                codeBlockLines.push(line);
                continue;
            }

            if (line.startsWith('# ')) {
                if (inList) {
                    html.push(`<ul>${listItems.join('')}</ul>`);
                    listItems = [];
                    inList = false;
                }
                html.push(`<h1>${this.parseInline(this.escapeHtml(line.slice(2)))}</h1>`);
                continue;
            }
            if (line.startsWith('## ')) {
                if (inList) {
                    html.push(`<ul>${listItems.join('')}</ul>`);
                    listItems = [];
                    inList = false;
                }
                html.push(`<h2>${this.parseInline(this.escapeHtml(line.slice(3)))}</h2>`);
                continue;
            }
            if (line.startsWith('### ')) {
                if (inList) {
                    html.push(`<ul>${listItems.join('')}</ul>`);
                    listItems = [];
                    inList = false;
                }
                html.push(`<h3>${this.parseInline(this.escapeHtml(line.slice(4)))}</h3>`);
                continue;
            }

            if (line.match(/^[-*]\s/)) {
                inList = true;
                listItems.push(`<li>${this.parseInline(this.escapeHtml(line.slice(2)))}</li>`);
                continue;
            }

            if (inList && trimmedLine !== '') {
                html.push(`<ul>${listItems.join('')}</ul>`);
                listItems = [];
                inList = false;
            }

            if (trimmedLine === '' || trimmedLine === '---') {
                continue;
            }
            if (line.startsWith('> ')) {
                html.push(`<blockquote>${this.parseInline(this.escapeHtml(line.slice(2)))}</blockquote>`);
                continue;
            }

            html.push(`<p>${this.parseInline(this.escapeHtml(line))}</p>`);
        }

        if (inList) {
            html.push(`<ul>${listItems.join('')}</ul>`);
        }

        return html.join('\n');
    }
}
