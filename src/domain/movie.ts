export default class movie {

    [x: string]: string;

    constructor(titleBr: string, titleEn: string, description: string, notes: any, year: string, 
                director: string, trailerBr: string, trailerEn :string) {
        this.titleBr = titleBr,
        this.titleEn = titleEn,
        this.description = description,
        this.notes = notes,
        this.year = year,
        this.director = director,
        this.trailerBr = trailerBr,
        this.trailerEn = trailerEn
    }
}