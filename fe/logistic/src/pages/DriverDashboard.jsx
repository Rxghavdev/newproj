
import React, { useEffect, useState, useRef } from "react";
import { FaCar, FaMotorcycle, FaTruck } from "react-icons/fa";
import { io } from "socket.io-client";
import * as api from "../services/api";
import {
  AppBar,
  Toolbar,
  Typography,
  Button,
  Container,
  Grid,
  CircularProgress,
  Box,
  IconButton,
  Card,
  CardContent,
  CardActions,
  Stepper,
  Step,
  StepLabel,
  ThemeProvider,
  createTheme,
  CssBaseline,
  Menu,
  MenuItem,
} from "@mui/material";
import RefreshIcon from "@mui/icons-material/Refresh";
import LogoutIcon from "@mui/icons-material/Logout";
import MoreVertIcon from "@mui/icons-material/MoreVert";
import {
  GoogleMap,
  DirectionsRenderer,
  Marker,
  useLoadScript,
} from "@react-google-maps/api";

const libraries = ["geometry"];

const socket = io("http://localhost:5000");
const statuses = [
  "pending",
  "accepted",
  "in_progress",
  "completed",
  "cancelled",
];

const GOOGLE_MAPS_API_KEY = process.env.REACT_APP_GOOGLE_MAPS_API_KEY; 

export default function DriverDashboard() {
  const [pendingBookings, setPendingBookings] = useState([]);
  const [acceptedBooking, setAcceptedBooking] = useState(null);
  const [loading, setLoading] = useState(true);
  const [driverName] = useState(
    localStorage.getItem("driverName") || "Driver"
  );
  const [bookingId, setBookingId] = useState("");
  const [anchorEl, setAnchorEl] = useState(null);
  const [driverLocation, setDriverLocation] = useState(null);
  const [directions, setDirections] = useState(null);
  const [destinationReached, setDestinationReached] = useState(false);
  const [eta, setEta] = useState(null); 

  const { isLoaded } = useLoadScript({
    googleMapsApiKey: GOOGLE_MAPS_API_KEY,
    libraries, 
  });

  const mapRef = useRef(null);
  const movementInterval = useRef(null); 
  const fetchPendingBookings = async () => {
    setLoading(true);
    try {
      const response = await api.getPendingBookings();
      const now = new Date();
      const bookingsToShow = response.data.bookings.filter(
        (booking) =>
          booking.status === "pending" ||
          (booking.status === "scheduled" &&
            new Date(booking.scheduledAt) <=
              new Date(now.getTime() + 10 * 60 * 1000))
      );
      setPendingBookings(bookingsToShow);
    } catch (error) {
      console.error("Error fetching bookings:", error);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchPendingBookings();
    return () => {
      if (movementInterval.current) {
        clearInterval(movementInterval.current);
      }
    };
  }, []);

  const toLatLngLiteral = (location) => {
    if (!location) return null;

    // Case 1: location is { lat, lng }
    if (typeof location.lat === "number" && typeof location.lng === "number") {
      return { lat: location.lat, lng: location.lng };
    }

    // Case 2: location is { coordinates: { lat, lng } }
    if (location.coordinates) {
      const { lat, lng } = location.coordinates;
      if (typeof lat === "number" && typeof lng === "number") {
        return { lat, lng };
      }
    }

    return null;
  };

  // Emiting location update whenever driverLocation changes
  useEffect(() => {
    if (driverLocation && bookingId && !destinationReached) {
      socket.emit("locationUpdate", {
        bookingId,
        lat: driverLocation.lat,
        lng: driverLocation.lng,
      });

      // Update ETA
      updateEta();
    }
  }, [driverLocation]);

  const handleAcceptBooking = async (id) => {
    try {
      navigator.geolocation.getCurrentPosition(
        async (position) => {
          const { latitude, longitude } = position.coords;
          const driverLoc = { lat: latitude, lng: longitude };
          setDriverLocation(driverLoc);
          setBookingId(id);
          const response = await api.acceptBooking({
            bookingId: id,
            driverLat: latitude,
            driverLng: longitude,
          });
          socket.emit("bookingStatusUpdate", {
            bookingId: id,
            status: "accepted",
          });
          setAcceptedBooking(response.data.booking);
          fetchPendingBookings();
          await calculateRoute(
            driverLoc,
            response.data.booking.pickupCoordinates
          );
        },
        (error) => console.error("Error fetching location:", error)
      );
    } catch (error) {
      console.error("Error accepting booking:", error);
    }
  };

  const handleUpdateStatus = async (newStatus) => {
    try {
      const updatedBooking = { ...acceptedBooking, status: newStatus };
      setAcceptedBooking(updatedBooking);

      socket.emit("bookingStatusUpdate", {
        bookingId: acceptedBooking._id,
        status: newStatus,
      });

      if (newStatus === "completed") {        await api.updateJobStatus({
          bookingId: acceptedBooking._id,
          status: newStatus,
        });

        setAcceptedBooking(null);
        setBookingId("");
        setDirections(null);
        setDriverLocation(null);
        setDestinationReached(false);
        setEta(null);
        fetchPendingBookings();

        if (movementInterval.current) {
          clearInterval(movementInterval.current);
        }
      } else if (newStatus === "in_progress") {
        setDestinationReached(false);

        await calculateRoute(
          driverLocation,
          acceptedBooking.dropoffCoordinates
        );
      }
    } catch (error) {
      console.error("Error updating status:", error);
    }
    setAnchorEl(null);
  };

  const calculateRoute = async (origin, destination) => {
    const originLatLng = toLatLngLiteral(origin);
    const destinationLatLng = toLatLngLiteral(destination);

    if (!originLatLng || !destinationLatLng) {
      console.error("Invalid origin or destination coordinates");
      console.error("Origin:", origin);
      console.error("Destination:", destination);
      return;
    }
    const directionsService = new window.google.maps.DirectionsService();
    try {
      const result = await directionsService.route({
        origin: originLatLng,
        destination: destinationLatLng,
        travelMode: window.google.maps.TravelMode.DRIVING,
      });
      setDirections(result);
      simulateMovement(result.routes[0].overview_path);
    } catch (error) {
      console.error("Error calculating route:", error);
    }
  };

  const simulateMovement = (path) => {
    if (!path || path.length === 0) return;

    setDestinationReached(false); 

    let index = 0;
    const speedKmh = 60; // Adjusting speed to 60 km/h
    const speedMs = (speedKmh * 1000) / 3600; 

    if (movementInterval.current) {
      clearInterval(movementInterval.current);
    }
    setDriverLocation({
      lat: path[0].lat(),
      lng: path[0].lng(),
    });

    movementInterval.current = setInterval(() => {
      if (index < path.length - 1) {
        const currentPoint = path[index];
        const nextPoint = path[index + 1];
        const distance =
          window.google.maps.geometry.spherical.computeDistanceBetween(
            currentPoint,
            nextPoint
          ); 
        const duration = distance / speedMs; 

        setDriverLocation({
          lat: nextPoint.lat(),
          lng: nextPoint.lng(),
        });

        index++;
        if (index >= path.length - 1) {
          clearInterval(movementInterval.current);
          setDestinationReached(true);
        }
      } else {
        clearInterval(movementInterval.current);
        setDestinationReached(true);
      }
    }, 1000); // Updating every 1 second
  };

  const updateEta = () => {
    if (!driverLocation || !directions || !acceptedBooking) return;

    let destination = null;
    if (acceptedBooking.status === "accepted" && !destinationReached) {
      destination = toLatLngLiteral(acceptedBooking.pickupCoordinates);
    } else if (acceptedBooking.status === "in_progress" && !destinationReached) {
      destination = toLatLngLiteral(acceptedBooking.dropoffCoordinates);
    } else {
      setEta(null); 
      return;
    }

    if (!destination) return;

    const remainingDistance =
      window.google.maps.geometry.spherical.computeDistanceBetween(
        new window.google.maps.LatLng(driverLocation.lat, driverLocation.lng),
        new window.google.maps.LatLng(destination.lat, destination.lng)
      ); 

    const speedMs = (60 * 1000) / 3600; // Speed in m/s (60 km/h)
    const remainingTimeSeconds = remainingDistance / speedMs;

    const etaDate = new Date(Date.now() + remainingTimeSeconds * 1000);
    const etaString = etaDate.toLocaleTimeString([], {
      hour: "2-digit",
      minute: "2-digit",
    });

    setEta(etaString);
  };

  const renderVehicleIcon = (vehicleType) => {
    switch (vehicleType) {
      case "car":
        return <FaCar style={{ color: "#2196f3", fontSize: "1.5rem" }} />;
      case "bike":
        return (
          <FaMotorcycle style={{ color: "#4caf50", fontSize: "1.5rem" }} />
        );
      case "truck":
        return <FaTruck style={{ color: "#ff9800", fontSize: "1.5rem" }} />;
      default:
        return null;
    }
  };

  const handleMenuClick = (event) => {
    setAnchorEl(event.currentTarget);
  };

  const handleMenuClose = (status) => {
    if (status) {
      handleUpdateStatus(status);
    } else {
      setAnchorEl(null);
    }
  };

  const darkTheme = createTheme({
    palette: {
      mode: "dark",
    },
  });

  if (loading || !isLoaded) {
    return (
      <ThemeProvider theme={darkTheme}>
        <CssBaseline />
        <Box
          display="flex"
          alignItems="center"
          justifyContent="center"
          minHeight="100vh"
        >
          <CircularProgress />
        </Box>
      </ThemeProvider>
    );
  }

  const carIcon = {
    url: "https://maps.google.com/mapfiles/kml/shapes/cabs.png",
    scaledSize: new window.google.maps.Size(40, 40), 
    anchor: new window.google.maps.Point(20, 20), 
  };

  
  const mapContainerStyle = {
    width: "100%",
    height: "100%",
    borderRadius: "15px", 
    overflow: "hidden", 
    boxShadow: "0 4px 6px rgba(0, 0, 0, 0.1)", 
  };

  return (
    <ThemeProvider theme={darkTheme}>
      <CssBaseline />
      <div>
        <AppBar position="static">
          <Toolbar>
            <Typography variant="h6">Welcome, {driverName}!</Typography>
            <Box flexGrow={1} />
            <IconButton color="inherit" onClick={fetchPendingBookings}>
              <RefreshIcon />
            </IconButton>
            <IconButton
              color="inherit"
              onClick={() => {
                localStorage.clear();
                window.location.reload();
              }}
            >
              <LogoutIcon />
            </IconButton>
          </Toolbar>
        </AppBar>
        <Container maxWidth="lg" style={{ marginTop: "2rem" }}>
          {acceptedBooking && (
            <Box mb={4}>
              <Typography variant="h5" gutterBottom>
                Current Booking
              </Typography>
              <Card>
                <CardContent>
                  <Grid container spacing={2} alignItems="center">
                    <Grid item xs={12} sm={8}>
                      <Typography variant="h6">
                        {acceptedBooking.pickupLocation} →{" "}
                        {acceptedBooking.dropoffLocation}
                      </Typography>
                      <Typography variant="subtitle1">
                        Price: ₹{acceptedBooking.price.toFixed(2)}
                      </Typography>
                      {eta && (
                        <Typography variant="subtitle1">
                          ETA: {eta}
                        </Typography>
                      )}
                    </Grid>
                    <Grid item xs={12} sm={4}>
                      {renderVehicleIcon(acceptedBooking.vehicleType)}
                    </Grid>
                  </Grid>
                  <Box mt={2}>
                    {renderStatusStepper(acceptedBooking.status)}
                  </Box>
                  <Box mt={2} height="400px">
                    <GoogleMap
                      center={driverLocation}
                      zoom={14}
                      mapContainerStyle={mapContainerStyle}
                      onLoad={(map) => (mapRef.current = map)}
                    >
                      {directions && (
                        <DirectionsRenderer directions={directions} />
                      )}
                      {driverLocation && (
                        <Marker
                          position={driverLocation}
                          icon={carIcon} // Use custom car icon
                          label={{
                            text: "Driver",
                            className: "map-marker-label",
                          }}
                        />
                      )}
                      {acceptedBooking.pickupCoordinates && (
                        <Marker
                          position={toLatLngLiteral(
                            acceptedBooking.pickupCoordinates
                          )}
                          label="Pickup"
                        />
                      )}
                      {acceptedBooking.dropoffCoordinates && (
                        <Marker
                          position={toLatLngLiteral(
                            acceptedBooking.dropoffCoordinates
                          )}
                          label="Drop-off"
                        />
                      )}
                    </GoogleMap>
                  </Box>
                </CardContent>
                <CardActions>
                  {acceptedBooking.status !== "completed" &&
                    acceptedBooking.status !== "cancelled" && (
                      <>
                        <Button
                          color="primary"
                          variant="contained"
                          onClick={handleMenuClick}
                          startIcon={<MoreVertIcon />}
                        >
                          Update Status
                        </Button>
                        <Menu
                          anchorEl={anchorEl}
                          open={Boolean(anchorEl)}
                          onClose={() => handleMenuClose(null)}
                        >
                          {statuses
                            .filter(
                              (status) =>
                                status !== acceptedBooking.status &&
                                status !== "pending"
                            )
                            .map((status) => (
                              <MenuItem
                                key={status}
                                onClick={() => handleMenuClose(status)}
                              >
                                {status.replace("_", " ")}
                              </MenuItem>
                            ))}
                        </Menu>
                      </>
                    )}
                </CardActions>
              </Card>
            </Box>
          )}
          <Box>
            <Typography variant="h5" gutterBottom>
              Pending Bookings
            </Typography>
            {pendingBookings.length === 0 ? (
              <Typography>No pending bookings available.</Typography>
            ) : (
              <Grid container spacing={4}>
                {pendingBookings.map((booking) => (
                  <Grid item xs={12} sm={6} md={4} key={booking._id}>
                    <Card>
                      <CardContent>
                        <Grid container spacing={2} alignItems="center">
                          <Grid item xs={12} sm={8}>
                            <Typography variant="h6">
                              {booking.pickupLocation} →{" "}
                              {booking.dropoffLocation}
                            </Typography>
                            <Typography variant="subtitle1">
                              Price: ₹{booking.price.toFixed(2)}
                            </Typography>
                          </Grid>
                          <Grid item xs={12} sm={4}>
                            {renderVehicleIcon(booking.vehicleType)}
                          </Grid>
                        </Grid>
                      </CardContent>
                      <CardActions>
                        <Button
                          color="primary"
                          variant="contained"
                          fullWidth
                          onClick={() => handleAcceptBooking(booking._id)}
                        >
                          Accept Booking
                        </Button>
                      </CardActions>
                    </Card>
                  </Grid>
                ))}
              </Grid>
            )}
          </Box>
        </Container>
      </div>
    </ThemeProvider>
  );
}

const renderStatusStepper = (currentStatus) => {
  const steps = ["accepted", "in_progress", "completed"];
  const activeStep = steps.indexOf(currentStatus);

  return (
    <Stepper activeStep={activeStep} alternativeLabel>
      {steps.map((label) => (
        <Step key={label}>
          <StepLabel>{label.replace("_", " ")}</StepLabel>
        </Step>
      ))}
    </Stepper>
  );
};
