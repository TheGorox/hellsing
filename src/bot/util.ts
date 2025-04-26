export function bbcodeToTelegramHTML(bbcode: string): string {
    const escape = (t: string): string => 
        t.replace(/&/g, "&amp;")
         .replace(/</g, "&lt;")
         .replace(/>/g, "&gt;")
         .replace(/"/g, "&quot;");

    return escape(bbcode)
        .replace(/\[URL=(.*?)\](.*?)\[\/URL\]/g, 
            (_, url: string, text: string) => `<a href="${escape(url)}">${escape(text)}</a>`)
        .replace(/\[B\](.*?)\[\/B\]/g, '<b>$1</b>')
        .replace(/\[I\](.*?)\[\/I\]/g, '<i>$1</i>')
        .replace(/\[U\](.*?)\[\/U\]/g, '<u>$1</u>')
        .replace(/\[S\](.*?)\[\/S\]/g, '<s>$1</s>')
        .replace(/^&gt;&gt;/, '>');
}