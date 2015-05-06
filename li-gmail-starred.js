// Modules and stuff required
var gsheets = require('gsheets')
var fs = require('fs-extra')
var ifttnorch = require('iftt-norch-tools')
var options = { indexPath: 'si', logLevel: 'info', logSilent: false }
var si = require('search-index')(options)
var jf = require('jsonfile')
var util = require('util')
var configfile = '/Users/eklem/node_modules/life-indexer/config/config-gmail-starred.json'


// Read config file
var config = jf.readFileSync(configfile)


// Get csv-file as 'data' (object)
gsheets.getWorksheet(config.gsheetsKey, config.gsheetsWorksheet, function(err, result) {
  if (err) {
    console.dif(err)
  }
  
  // Check if ANY changes since last indexing process
  else if (result.updated != config.gsheetLastUpdated) {

    console.log('Index is not up to date.\nGsheet updated: ' + config.gsheetLastUpdated + '\nConfig updated: ' + result.updated)
    var newItems = []
    var datesUpdated = []

    // Iterating through rows of data from spreadsheet
    for (var i=0; i<result.data.length; i++) {
      var obj = result.data[i]

      // Getting date and checking if indexed before
      obj.date = ifttnorch.date(obj.date)
      if (obj.date > config.newestItemDate) {
        
        // Document processing the rest
        obj.datehuman = ifttnorch.datehuman(obj.date)
        obj.text = ifttnorch.sanitizehtml(obj.text)
        obj.type = [config.type]
        obj.id = ifttnorch.id(obj.date + obj.text + obj.title + obj.file)
        obj.email = ifttnorch.emailaddress(obj.email)
        obj.user = ifttnorch.emailuser(obj.email)
        obj.gravatar = ifttnorch.emailgravatar(obj.email)
        
        // Push to the array that will be indexed + array for latest update
        newItems.push(obj)
        datesUpdated.push(obj.date)
      }
    }

    //console.dir(newItems)

    //Index newItems and update config-file with new dates'
    //console.dir(config)
    si.add({'batchName': config.batchname, 'filters': config.filters}, newItems, function(err) {
      if (!err) {
        console.log('indexed!')
        config.newestItemDate = ifttnorch.findnewestdate(datesUpdated)
        config.gsheetLastUpdated = result.updated

        // Write config file
        jf.writeFileSync(configfile, config)
      } else if (err) {
        console.log('Error indexing' + err)
      }
    })
  }

  // Nothing to index, just move along
  else {
    console.log('Index is up to date.\nNothing to index.\nGsheet updated: ' + config.gsheetLastUpdated + '\nConfig updated: ' + result.updated)
  }
})
