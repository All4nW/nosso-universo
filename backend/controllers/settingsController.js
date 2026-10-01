const Settings = require("../models/settingsModel");

exports.getSettings = async (req, res) => {

    try {

        const dados = await Settings.getSettings();

        res.json(dados);

    }

    catch(err){

        res.status(500).json(err);

    }

};

exports.saveSettings = async (req,res)=>{

    try{

        await Settings.saveSettings(req.body);

        res.json({

            success:true

        });

    }

    catch(err){

        res.status(500).json(err);

    }

};