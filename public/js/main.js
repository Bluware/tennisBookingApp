
$( ".mainContainer" ).load( "/loadBookings", function() {

});

$('.btnChangeCourt').on("click", function(e){

  var courtID = $(e.currentTarget).attr('data-courtID');
  $('.court').hide();
  $('.court_' + courtID).fadeIn();

  return(false);
});

$('.btnRefreshBookings').on("click", function(e){
  $('.refreshingIcon').addClass('gly-spin');
  $( ".mainContainer" ).html('');
  $.getJSON('/refreshBookings', function(response){
    $( ".mainContainer" ).load( "/loadBookings", function() {
      $('.refreshingIcon').removeClass('gly-spin');
    });
  });

  return(false);
});
