interface QLocale {
    nativeLanguageName: string;
}

declare namespace Qt {
    export function locale(name: string): QLocale;
}
