const imgs = document.querySelectorAll("img");
const dialog = document.querySelector("dialog");
let currentElementId = null;



imgs.forEach(img => {
    img.addEventListener('click', function(event) {
        dialog.innerHTML = "";
        const img_url = img.src; 
        console.log(img_url);
        const numbers = img_url.match(/\d+/g);
        const lastNumber = numbers[numbers.length - 1];
        currentElementId = lastNumber;
        // currentElementId = event.target.id;
        console.log('Selected element ID:', currentElementId);

        const url = `https://api.opensea.io/api/v2/chain/base/contract/0xEe7D1B184be8185Adc7052635329152a4d0cdEfA/nfts/${currentElementId}`;
        const options = {
          method: 'GET',
          headers: {accept: 'application/json', 'x-api-key': 'addefeded9d74613a41df4016df9cf3f'}
        };

        const dialog_img = document.createElement("img");

        fetch(url, options)
          .then(res => res.json())
          .then(json => {
            // const imageUrl = json.nft.image_url;
            const attributes = json.nft.traits || json.nft.metadata?.attributes || [];
            const cleanAttributes = attributes.map(attr => ({
              trait_type: attr.trait_type,
              value: attr.value
            }));
            // const dialog_img = document.createElement("img");
            dialog_img.src = img.src;
            dialog.prepend(dialog_img);
            dialog.innerHTML += `<pre>${JSON.stringify(cleanAttributes, null, 4)}</pre>`;
          })
          .catch(err => console.error(err));

          dialog.addEventListener("click", e => {
          const dialogDimensions = dialog.getBoundingClientRect()
          if (
            e.clientX < dialogDimensions.left ||
            e.clientX > dialogDimensions.right ||
            e.clientY < dialogDimensions.top ||
            e.clientY > dialogDimensions.bottom
          ) {
            dialog.close()
          }
        })

        dialog.showModal();
    });
});


