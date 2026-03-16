interface MarkerPopupHandlerReturn {
    updateLanguage: (language: string) => void
    performChanges: (language: string) => void
}

type MarkerPopupHandler = (object: MapObject, dialog: Dialog) => MarkerPopupHandlerReturn;
