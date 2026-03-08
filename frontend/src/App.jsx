import ButtonBlack from "./assets/components/buttonblack";

const App = () => {
  return (
    <div>
      <h1>To do list</h1>
      <ButtonBlack text="Add Task" onClick={() => console.log("Add Task clicked")} />
    </div>

  );
};

export default App;