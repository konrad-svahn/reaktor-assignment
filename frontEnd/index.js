fetch("http://localhost:3030")
.then(res1 => res1.json())
.then(res2 => mnageData(res2))

function mnageData (data) {
    console.log(data)
    let list = ""
    for (const person of data) {
        list += `
            <div class="pilot">
                <p>first name: ${person.firstName}</p>
                <p>last name: ${person.lastName}</p>
                <p>email: ${person.email}</p>
                <p>phone number: ${person.phoneNumber}</p> 
                <p>closest distance: ${person.distance}mm</p>
                <p>------------------------------------</p>
            </div>
        `
    }
    document.querySelector("#display").innerHTML = list
}