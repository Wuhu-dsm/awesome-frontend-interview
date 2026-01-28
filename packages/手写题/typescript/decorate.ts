

function log(...args: any[]) {
    console.log(args)
}

@log
class controller {
    constructor() {

    }
    @log
    say() {

    }
}