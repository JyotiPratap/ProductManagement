const validator = require('../utils/validator')
const productModel = require('../models/productModel')
const userModel = require('../models/userModel')
const cartModel = require('../models/cartModel')

const cartCreation = async function (req, res) {
    try {
        const userId = req.params.userId
        const requestBody = req.body;
        const { quantity, productId } = requestBody
        let userIdFromToken = req.userId;

        //validating starts.
        if (!validator.isValidRequestBody(requestBody)) {
            return res.status(400).send({ status: false, message: "Please provide valid request body" })
        }

        if (!validator.isValidObjectId(userId)) {
            return res.status(400).send({ status: false, msg: "userId invalid" })
        }
        if (!validator.isValidObjectId(productId)) {
            return res.status(400).send({ status: false, message: `plz provide valid productId` })
        }

        if (!validator.isValid(quantity) || !validator.validQuantity(quantity)) {
            return res.status(400).send({ status: false, message: "Please provide valid quantity & it must be greater than zero." })
        }
        //validation ends.

        const findUser = await userModel.findById({ _id: userId })
        if (!findUser) {
            return res.status(400).send({ status: false, message: `User doesn't exist by ${userId}` })
        }

        //Authentication & authorization
        if (findUser._id.toString() != userIdFromToken) {
            return res.status(401).send({ status: false, message: `Unauthorized access! User's info doesn't match` });
        }

        const findProduct = await productModel.findOne({ _id: productId, isDeleted: false })
        if (!findProduct) {
            return res.status(400).send({ status: false, message: `Product doesn't exist by ${productId}` })
        }

        const findCartOfUser = await cartModel.findOne({ userId: userId }) //finding cart related to user.

        if (!findCartOfUser) {

            //destructuring for the response body.
            var cartData = {
                userId: userId,
                productId: productId,
                quantity: quantity,
                totalPrice: findProduct.price * quantity,
                totalItems: 1
            }

            const createCart = await cartModel.create(cartData)
            return res.status(201).send({ status: true, message: `Cart created successfully`, data: createCart })
        }

        if (findCartOfUser) {

            //updating price when products get added or removed.
            let price = findCartOfUser.totalPrice + (req.body.quantity * findProduct.price)
            let itemsArr = findCartOfUser.items

            //updating quantity.
            for (i in itemsArr) {
                if (itemsArr[i].productId=== productId) {
                    itemsArr[i].quantity += quantity

                    let updatedCart = { items: itemsArr, totalPrice: price, totalItems: itemsArr.length }

                    let responseData = await cartModel.findOneAndUpdate({ _id: findCartOfUser._id }, updatedCart, { new: true })

                    return res.status(200).send({ status: true, message: `Product added successfully`, data: responseData })
                }
            }
            itemsArr.push({ productId: productId, quantity: quantity }) //storing the updated prices and quantity to the newly created array.

            let updatedCart = { items: itemsArr, totalPrice: price, totalItems: itemsArr.length }
            let responseData = await cartModel.findOneAndUpdate({ _id: findCartOfUser._id }, updatedCart, { new: true })

            return res.status(200).send({ status: true, message: `Product added successfully`, data: responseData })
        }
    } catch (err) {
        res.status(500).send({ status: false, data: err.message });
    }
}

//update cart.
const updateCart = async (req, res) => {
    try {
const userId = req.params.userId
       const { cartId, productId, removeProduct } = req.body
       const key = Object.keys(req.body)
       if (key == 0) {
           return res.status(400).send({ status: false, msg: "please enter some data" })
       }
       if (!validator.isValid(userId)) {
           return res.status(400).send({ status: false, msg: "userId is invalid" })
       }
       if (!validator.isValid(cartId)) {
           return res.status(400).send({ status: false, msg: "cartId is required" })
       }
       if (!validator.isValidObjectId(cartId)) {
           return res.status(400).send({ status: false, msg: "cartId is invalid" })
       }
       if (!validator.isValid(productId)) {
           return res.status(400).send({ status: false, msg: "productId is required" })
       }
       if (!validator.isValidObjectId(productId)) {
           return res.status(400).send({ status: false, msg: "productId is invalid" })
       }
       if (!validator.isValid(removeProduct)) {
           return res.status(400).send({ status: false, msg: "removeProduct is required" })
       }
       let cartData = await cartModel.findOne({ _id: cartId })
       if (!cartData) { return res.status(404).send({ status: false, msg: "cartData not found !" }) }

       // if (typeof removeProduct != 'number') {
       //     return res.status(400).send({ status: false, msg: "only number are allowed!" })
       // }

       if (removeProduct == 0) {
           let items = []
           let dataObj = {}
           let removePrice = 0
           for (let i = 0; i < cartData.items.length; i++) {
               if (cartData.items[i].productId != productId) {
                   return res.status(400).send({ status: false, msg: "product not found in the cart" })
               }
               if (cartData.items[i].productId == productId) {
                   const productRes = await productModel.findOne({ _id: productId, isDeleted: false }).select({_id:0,price:1})
                   console.log(productRes)
                   if (!productRes) { return res.status(400).send({ status: false, msg: "product not found !" }) }
                   removePrice = productRes.price * cartData.items[i].quantity
               }
               else{
               items.push(cartData.items[i])
               productPrice = cartData.totalPrice;
               }

           }
           productPrice = cartData.totalPrice - removePrice;
           
           dataObj['totalPrice'] = productPrice
           dataObj['totalItems'] = items.length
           dataObj['items'] = items
           const removeRes = await cartModel.findOneAndUpdate({ productId: productId }, dataObj, { new: true })
           return res.status(200).send({ status: true, message: "remove success", data: removeRes })

       }
       if (removeProduct == 1) {
           let dataObj = {}
           let item = []
           let itemPrice = 0
           for (let i = 0; i < cartData.items.length; i++) {
               if (cartData.items[i].productId != productId) {
                   return res.status(400).send({ status: false, msg: "product not found in the cart" })
               }
               if (cartData.items[i].productId == productId) {
                   const productRes = await productModel.findOne({ _id: productId, isDeleted: false }).select({ _id: 0, price: 1 })
                   if (!productRes) { return res.status(404).send({ status: false, msg: "product not found !" }) }
                   if(cartData.items[i].quantity == 1){
                       itemPrice = cartData.totalPrice - productRes.price
                   }
                   else{
                       item.push({productId:productId,quantity:cartData.items[i].quantity - 1})
                       itemPrice = cartData.totalPrice - productRes.price
                   }
                   console.log(productRes.price,itemPrice)
                   
               }
               else{
                   item.push(cartData.items[i])
               }


               let reduceData = await cartModel.findOneAndUpdate({ productId: productId },{totalPrice:itemPrice,totalItems:item.length,items:item}, { new: true })
               return res.status(200).send({ status: true, message: "success", data: reduceData })

           }

       }

       else {
           return res.status(400).send({ status: false, msg: "removeProduct field should be allowed only 0 and 1 " })
       }

   }catch (error) {
     return res.status(500).json({ status: false, msg: error.message });
   }
 };

//fetching cart details.
const getCart = async function (req, res) {
    try {
        const userId = req.params.userId;
        let userIdFromToken = req.userId

        //validation starts
        if (!validator.isValidObjectId(userId)) {
            return res.status(400).send({ status: false, message: "Invalid userId in params." })
        }
        //validation ends
        const findUser = await userModel.findById({ _id: userId })
        if (!findUser) {
            return res.status(400).send({ status: false, message: "User doesn't exists by" })
        }

        //Authentication & authorization
        if (findUser._id.toString() != userIdFromToken) {
            return res.status(401).send({ status: false, message: "Unauthorized access User's info doesn't match" });

        }

        const findCart = await cartModel.findOne({ userId: userId })

        if (!findCart) {
            return res.status(400).send({ status: false, message: "Cart doesn't exists by" })
        }

        return res.status(200).send({ status: true, message: "Successfully fetched cart.", data: findCart })

    } catch (err) {
        return res.status(500).send({ status: false, message: "Error is : " + err })
    }
};

//deleting cart- changing its items,price & totlItems to 0.
const deleteCart = async function (req, res) {
    try {
        const userId = req.params.userId;
        let userIdFromToken = req.userId

        //validating userId
        if (!validator.isValidObjectId(userId)) {
            return res.status(400).send({ status: false, message: "Invalid userId in params." })
        }
        const findUser = await userModel.findOne({ _id: userId })
        if (!findUser) {
            return res.status(400).send({ status: false, message: "User doesn't exists by" })
        }

        //Authentication & authorization
        if (findUser._id.toString() != userIdFromToken) {
            return res.status(401).send({ status: false, message: "Unauthorized access! User's info doesn't match" })

        }

        //finding cart
        const findCart = await cartModel.findOne({ userId: userId })
        if (!findCart) {
            return res.status(400).send({ status: false, message: "Cart doesn't exists" })
        }
        //Basically not deleting the cart, just changing their value to 0.
        const deleteCart = await cartModel.findOneAndUpdate({ userId: userId }, {
            $set: {
                items: [],
                totalPrice: 0,
                totalItems: 0
            }
        })
        return res.status(204).send({ status: true, message: "Cart deleted successfully" })

    } catch (err) {
        return res.status(500).send({ status: false, message: "Error is : " + err })
    }
}

module.exports = {
    cartCreation,
    updateCart,
    getCart,
    deleteCart
}