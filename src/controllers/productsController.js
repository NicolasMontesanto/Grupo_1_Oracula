const path = require('path');
const fs = require("fs");
let products = require('../data/products.json');
//express validator
const { validationResult } = require('express-validator');
const db = require('../database/models');
const sequelize = require("sequelize");
const { promiseImpl } = require('ejs');
const { log, Console } = require('console');

let sortear = function (productosASortear) {
    let sorteados = productosASortear.sort(() => Math.random() - 0.5)
    return sorteados;
}

const productsController = {
    //productDetail.html
    detail: (req, res) => {
        let id = req.params.id;
        db.Product.findByPk(id, {
            include: "image",
            raw: true,
            nest: true
        })
            .then(producto => {
                let productosDeCategoria;
                db.Product.findAll({
                    where: {
                        categoryID: producto.categoryID,
                        id: {
                            [sequelize.Op.not]: producto.id
                        }
                    },
                    include: "image",
                    raw: true,
                    nest: true
                })
                    .then(productos => {
                        //productosDeCategoria = productos.filter(item => item.id != producto.id);
                        let productosDesordenados = sortear(productos);
                        console.log(productosDesordenados);
                        res.render('./products/productDetail', { elProducto: producto, productosDesordenados });
                    })
                    .catch(err => {
                        console.log(err)
                    })
            })
            .catch(err => {
                console.log(err)
            })
    },

    //Renderizar vista de todos los productos
    list: (req, res) => {
        db.Product.findAll({
            include: "image",
            raw: true,
            nest: true
        })
            .then(productos => {
                res.render('./products/productList', { products: productos });
            })
    },


    //Renderizar Vista Create
    create: (req, res) => {
        //Busco las categorías, subcategorias y géneros
        let promesaCategorias = db.Category.findAll();
        let promesaSubcategorias = db.Subcategory.findAll();
        let promesaGeneros = db.Genre.findAll();

        Promise.all([promesaCategorias, promesaSubcategorias, promesaGeneros])
            .then(function ([resultadoCategorias, resultadoSubcategorias, resultadoGeneros]) {
                //Mando las categorias, subcategorias y géneros a la vista
                res.render('./products/productCreate', { categorias: resultadoCategorias, subcategorias: resultadoSubcategorias, generos: resultadoGeneros });
            })
    },

    //Guardar producto nuevo
    store: (req, res) => {

        const validationsResult = validationResult(req);

        //si hay errores se renderiza de nuevo el formulario de creación
        if (validationsResult.errors.length > 0) {
            if (req.file.filename) {
                fs.unlinkSync(path.join(__dirname, "../../public/img/productos", req.file.filename));
            }
            //Busca todas las categorías, subcategorías y géneros
            let promesaCategorias = db.Category.findAll();
            let promesaSubcategorias = db.Subcategory.findAll();
            let promesaGeneros = db.Genre.findAll();

            Promise.all([promesaCategorias, promesaSubcategorias, promesaGeneros])
                .then(function ([resultadoCategorias, resultadoSubcategorias, resultadoGeneros]) {
                    //Mando las categorias, subcategorias, géneros, errores y datos previamente cargados a la vista
                    res.render('./products/productCreate', {
                        categorias: resultadoCategorias,
                        subcategorias: resultadoSubcategorias,
                        generos: resultadoGeneros,
                        errors: validationsResult.mapped(),
                        oldData: req.body
                    });
                })
        }
        //Si no hay errores, se procede con la carga del producto
        else {
            //Toma los datos del req y del req.body

            //Guarda el atributo file del request, donde se encuentra la imagen cargada
            let file = req.file;

            //Valores de esDestacado, esNovedad, esMagicPass
            let esDestacado, esNovedad, esMagicPass;
            esDestacado = req.body.esDestacado ? true : false;
            esNovedad = req.body.esNovedad ? true : false;
            esMagicPass = req.body.esMagicPass ? true : false;

            //Array de Géneros donde se guardan los géneros cargados para el producto, si no se cargan géneros se asigna el género "Inclasificable"
            let generos = [];
            if (req.body.esMedieval) {
                let id = parseInt(req.body.esMedieval);
                generos.push(id);
            }
            if (req.body.esUrbana) {
                let id = parseInt(req.body.esUrbana);
                generos.push(id);
            }
            if (req.body.esClasica) {
                let id = parseInt(req.body.esClasica);
                generos.push(id);
            }
            if (req.body.esOscura) {
                let id = parseInt(req.body.esOscura);
                generos.push(id);
            }
            if (req.body.esJuvenil) {
                let id = parseInt(req.body.esJuvenil);
                generos.push(id);
            }
            if (generos.length == 0) {
                generos.push(6);
            }

            //Crea el producto
            db.Product.create({
                nombre: req.body.nombre,
                descripcion: req.body.descripcion,
                precio: req.body.precio,
                descuento: req.body.descuento,
                esNovedad: esNovedad,
                esDestacado: esDestacado,
                esMagicPass: esMagicPass,
                categoryID: req.body.categoria,
                subcategoryID: req.body.subcategoria,
            })
                .then(producto => {
                    //Crea una imagen asociada al producto recién creado
                    db.Image.create({
                        url: `/img/productos/${file.filename}`,
                        productID: producto.id
                    });

                    //Crea las asociaciones entre el producto y sus géneros
                    producto.setGenre(generos);

                    //Busca los atributos pertenecientes a la subcategoría del producto creado
                    db.Attribute.findAll({
                        where: {
                            subcategoryID: producto.subcategoryID
                        }
                    })
                        .then(atributos => {
                            //Según el id de la categoría del producto, carga los valores a los atributos correspondientes
                            switch (producto.subcategoryID) {
                                case '1':
                                    producto.addAttribute(atributos[0], { through: { valor: req.body.cantidadJugadorxs } });
                                    producto.addAttribute(atributos[1], { through: { valor: req.body.edadRecomendada } });
                                    break;
                                case '2':
                                    producto.addAttribute(atributos[0], { through: { valor: req.body.desarrolladorx } });
                                    producto.addAttribute(atributos[1], { through: { valor: req.body.lanzamiento } });
                                    break;
                                case '3':
                                    producto.addAttribute(atributos[0], { through: { valor: req.body.extension } });
                                    producto.addAttribute(atributos[1], { through: { valor: req.body.autoriaLibro } });
                                    break;
                                case '4':
                                    producto.addAttribute(atributos[0], { through: { valor: req.body.duracionAudiolibro } });
                                    producto.addAttribute(atributos[1], { through: { valor: req.body.autoriaAudiolibro } });
                                    producto.addAttribute(atributos[2], { through: { valor: req.body.narradorx } });
                                    break;
                                case '5':
                                    producto.addAttribute(atributos[0], { through: { valor: req.body.talle } });
                                    break;
                                case '6': break
                                case '7': break
                                case '8':
                                    producto.addAttribute(atributos[0], { through: { valor: req.body.duracionPelicula } });
                                    break;
                                case '9':
                                    producto.addAttribute(atributos[0], { through: { valor: req.body.duracionSoundtrack } });
                                    break;
                            }
                        })
                })

            //Redirecciona a Home
            res.redirect("/");
        }
    },

    //Renderizamos la vista de Edit
    edit: (req, res) => {
        let id = req.params.id;
        let product = products.find(element => element.id == id);
        if (product == undefined) {
            res.send("Producto no encontrado");
        } else {
            res.render('./products/productEdit', { product });
        }
    },
    update: (req, res) => {
        let id = req.params.id;
        let file = req.file;
        const validationsResult = validationResult(req);

        //si hay errores se renderiza de nuevo el formulario de creación
        if (validationsResult.errors.length > 0) {
            if (req.file && req.file.filename) {
                fs.unlinkSync(path.join(__dirname, "../../public", req.file.filename));
            }
            let product = products.find(element => element.id == id);
            res.render("./products/productEdit", {
                product: product,
                errors: validationsResult.mapped(),
            })
        }
        else {

            //Valores de esDestacado, esNovedad, esOferta
            let esDestacado, esNovedad, esOferta, esMagicPass;

            esDestacado = req.body.esDestacado ? true : false;
            esNovedad = req.body.esNovedad ? true : false;
            esOferta = req.body.esOferta ? true : false;
            esMagicPass = req.body.esMagicPass ? true : false;

            //Array de Objetos Género
            let generos = [];
            if (req.body.esGeneroMedieval) {
                generos.push("medieval");
            }
            if (req.body.esGeneroUrbana) {
                generos.push("urbana");
            }
            if (req.body.esGeneroClasica) {
                generos.push("clasica");
            }
            if (req.body.esGeneroOscura) {
                generos.push("oscura");
            }
            if (req.body.esGeneroJuvenil) {
                generos.push("juvenil");
            }

            let { nombre, descripcion, precio, categoria, subcategoria, descuento } = req.body;
            products.forEach(item => {
                if (item.id == id) {
                    item.nombre = nombre;
                    item.descripcion = descripcion;
                    item.precio = precio;
                    item.categoria = categoria;
                    item.subcategoria = subcategoria;
                    item.generos = generos;
                    item.esNovedad = esNovedad;
                    item.esDestacado = esDestacado;
                    item.esOferta = esOferta;
                    item.descuento = descuento;
                    item.esMagicPass = esMagicPass;
                    if (file) {
                        if (item.imagenes) {
                            fs.unlinkSync(path.join(__dirname, "../../public", item.imagenes));
                        }
                        item.imagenes = `/img/productos/${file.filename}`;
                    }
                }
            });
            let productsJSON = JSON.stringify(products, null, 4);
            fs.writeFileSync(path.join(__dirname, "../data/products.json"), productsJSON, "utf-8");
            res.redirect("/");
        }
    },
    delete: (req, res) => {
        let id = req.params.id;
        let productToDelete = products.find(item => item.id == id);

        let productImg = path.join(__dirname, "../../public/img/productos" + productToDelete.imagenes);

        products = products.filter(product => product.id != id);

        if (fs.existsSync(productImg)) {
            fs.unlinkSync(productImg);
        }

        let productsJSON = JSON.stringify(products, null, 4);
        fs.writeFileSync(path.join(__dirname, "../data/products.json"), productsJSON, "utf-8");
        res.redirect("/");
    },
    //productCart.html
    cart: (req, res) => {
        db.CartProduct.findAll({

            raw: true,
            nest: true
        })
            .then(productos => {
                let arrayID = [];
                let arrayProductos = [];
                for(let i = 0; i < productos.length; i++) {
                    arrayID.push(productos[i].productID);
                }
                
                    db.Product.findAll( {
                        where: {
                            id: arrayID
                        },
                        include:"image", 
                        raw: true, 
                        nest: true} )
                    .then(producto => {
                        
                        console.log("ESTE ES EL CONSOLE LOG");
                        
                        arrayProductos.push(producto)

                    })
                

                res.render('./products/productCart', { arrayProductos: arrayProductos });
            })
        
        
    },
    //Boton que agrega el producto a la tabla de la DB
    cartButton: (req, res) => {
        db.CartProduct.findOne({
            where: {
                productID: req.params.id,
                cartID: req.session.userLogged.id
            }
        })
        .then(productoCarrito => {
            if (productoCarrito) {
                db.CartProduct.update({
                    cantidad: productoCarrito.cantidad + 1},
                    {where:{
                        id: productoCarrito.id
                    }} 
                )
                .then(resultado => {
                    res.redirect('/product/cart');
                })

            } else {
                db.CartProduct.create({

                    productID: req.params.id,
                    cartID: req.session.userLogged.id,
                    cantidad: 1
        
                })
                .then(resultado => {
                    res.redirect('/product/cart');
                })
            }
        })
    },
    
    //Borra productos del carrito
    cartDelete: (req,res) => {
        db.CartProduct.destroy({
            where: {
                id: req.params.id
            }
        }),

        res.redirect('/cart')
    }
};
module.exports = productsController;