fetch("http://localhost:3030")
    .then(res1 => res1.json())
    .then(res2 => mnageData(res2, 0))

setInterval(getpilots, 2000)

function getpilots () {
    fetch("http://localhost:3030")
    .then(res1 => res1.json())
    .then(res2 => mnageData(res2, 1))
}

function mnageData (data, mod) {
    console.log(data)
    console.log(mod)
    let list = ""
    for (const person of data) {

        let now = new Date().getTime()
        let milliseconds = new Date(person.retrieved).getTime()

        if ((now - milliseconds) > 5000 || mod == 0) {}

        list += `
            <div class="pilot" id="${person.pilotId}">
                <p>first name: ${person.firstName}</p>
                <p>last name: ${person.lastName}</p>
                <p>email: ${person.email}</p>
                <p>phone number: ${person.phoneNumber}</p> 
                <p>closest distance: ${person.distance}mm</p>
                <p>latest violation: ${person.retrieved}</p> 
                <p>------------------------------------</p>
            </div>
        `
    }
    document.querySelector("#display").innerHTML = list
}